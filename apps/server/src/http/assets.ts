/**
 * /api/assets 路由组（M2 T3-T4，design §3/§7/§9）：
 * POST 注册（asset:publish 空间成员判定）· GET 列表（读面可见 SQL 过滤）·
 * GET 详情（visibility 判定；PUBLIC 匿名可读）· PATCH visibility/status ·
 * DELETE（owner/空间 ADMIN+，仅无 PUBLISHED）。
 *
 * 读面拒绝语义（design §7，skillhub 对齐）：坐标不存在/非 ACTIVE → 404；
 * ns ARCHIVED 非成员 → 403 namespace_archived；visibility 拒 → 403 access_denied。
 * 管理面判定（design §7/05 §6.4）：owner 或空间 ADMIN+（canManageAsset 组合）+
 * 空间非 ACTIVE 拒写门 + SUPER_ADMIN 短路。
 */
import { slugSchema } from '@ai-asset-hub/protocol';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuditWriter } from '../audit/audit.js';
import type { RateLimiter } from '../auth/rate-limit.js';
import { AssetError, assetErrorCodes, UploadValidationError } from '../assets/errors.js';
import { canManageAsset } from '../assets/manage.js';
import {
  createAsset,
  findNamespaceBySlug,
  getAsset,
  listViewableAssets,
  type AssetRow,
} from '../assets/service.js';
import { canViewAsset } from '../assets/visibility.js';
import { createVersion } from '../assets/versions.js';
import { AuthError } from '../auth/errors.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { getEnv } from '../config/env.js';
import type { Db } from '../db/client.js';
import {
  asset,
  assetFile,
  assetStatusSchema,
  assetTypeSchema,
  assetVersion,
  type NamespaceRole,
  visibilitySchema,
} from '../db/schema/index.js';
import type { ObjectStorage } from '../storage/types.js';
import { requireAuth } from './auth-middleware.js';

export interface AssetRoutesDeps {
  db: Db;
  /** 审计写入器（资产动作 asset.* 埋点；T3-T4 起） */
  audit: AuditWriter;
  /** 资产删除连带存储清理（deleteMany） */
  storage: ObjectStorage;
  /** 上传限流（每用户窗口——skillhub publish=10 同构；独立实例防与登录共享挤占） */
  uploadRateLimiter: RateLimiter;
}

/** 上传限流配置（T13：10 次/分钟·每用户——常量装配于 app.ts 独立实例） */
export const UPLOAD_RATE_LIMIT = { windowMs: 60_000, max: 10 } as const;

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  nsSlug: z.string().trim().min(1).max(64).optional(),
  type: assetTypeSchema.optional(),
  visibility: visibilitySchema.optional(),
});

/** POST /api/assets body（注册；visibility 默认 PUBLIC 由服务层兜底） */
const createBodySchema = z.object({
  namespaceSlug: slugSchema,
  slug: slugSchema,
  type: assetTypeSchema,
  visibility: visibilitySchema.optional(),
});

/** PATCH /:ns/:slug body（visibility 修改——Q3） */
const visibilityBodySchema = z.object({ visibility: visibilitySchema });

/** 版本号（01 §3 semver——基础三段 + 可选 pre-release/build 限定） */
const versionFieldSchema = z
  .string()
  .max(64)
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/, 'request.invalid');

/** changelog 长度界（防滥——text 列无界） */
const changelogFieldSchema = z.string().max(4096).optional();

/** PATCH /:ns/:slug/status body（状态治理——05 §6.4 asset:manage） */
const statusBodySchema = z.object({ status: assetStatusSchema });

/** 序列化响应形状（详情/注册/列表共用；坐标回显自足——含 namespaceSlug） */
function assetItem(row: AssetRow, namespaceSlug: string) {
  return {
    id: row.id,
    namespaceId: row.namespaceId,
    namespaceSlug,
    slug: row.slug,
    type: row.type,
    visibility: row.visibility,
    status: row.status,
    ownerId: row.ownerId,
    downloadCount: row.downloadCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** viewer 上下文组装（仅登录时查询；匿名 → role null + 非超管） */
async function viewerContext(
  c: import('hono').Context,
  namespaceId: number,
): Promise<{ viewerId: string | null; namespaceRole: NamespaceRole | null; isSuperAdmin: boolean }> {
  const principal = c.get('principal') ?? null;
  if (!principal) return { viewerId: null, namespaceRole: null, isSuperAdmin: false };
  const rbac = c.get('rbac')!;
  const roles = await rbac.getNamespaceRoles(principal.userId, namespaceId);
  const platformRoles = await rbac.platformRolesOf(principal.userId);
  return {
    viewerId: principal.userId,
    namespaceRole: (roles[0] as NamespaceRole | undefined) ?? null,
    isSuperAdmin: platformRoles.includes('SUPER_ADMIN'),
  };
}

/** 坐标加载（管理端点共用：ns/asset 不存在 → 404 asset.not_found） */
async function loadAssetBySlugs(db: Db, nsSlug: string, slug: string) {
  if (!slugSchema.safeParse(nsSlug).success || !slugSchema.safeParse(slug).success) {
    throw new AssetError(assetErrorCodes.notFound);
  }
  const ns = await findNamespaceBySlug(db, nsSlug);
  if (!ns) throw new AssetError(assetErrorCodes.notFound);
  const row = await getAsset(db, nsSlug, slug);
  if (!row) throw new AssetError(assetErrorCodes.notFound);
  return { ns, row };
}

/**
 * 管理面门（requireAuth 后）：SUPER_ADMIN 短路 → 空间非 ACTIVE 拒写（05 §6.3
 * FROZEN 只读/ARCHIVED 归档——owner 亦不能绕过空间冻结）→ canManageAsset
 * （owner 或空间 ADMIN+，05 §6.4）。失败统一 auth.forbidden（写管理面无 404 语义）。
 */
async function assertManageable(
  c: import('hono').Context,
  ns: { id: number; status: string },
  row: { ownerId: string },
): Promise<{ isSuperAdmin: boolean }> {
  const principal = c.get('principal')!;
  const viewer = await viewerContext(c, ns.id);
  if (viewer.isSuperAdmin) return { isSuperAdmin: true };
  if (ns.status !== 'ACTIVE') throw new AuthError('auth.forbidden');
  const allowed = canManageAsset({
    ownerId: row.ownerId,
    viewerId: principal.userId,
    namespaceRole: viewer.namespaceRole,
    isSuperAdmin: false,
  });
  if (!allowed) throw new AuthError('auth.forbidden');
  return { isSuperAdmin: false };
}

export function createAssetRoutes(deps: AssetRoutesDeps): Hono {
  const app = new Hono();
  const { db } = deps;

  // POST /api/assets（T3：注册——asset:publish 空间成员判定；FROZEN/ARCHIVED 由 rbac.can 拒）
  app.post('/', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const rbac = c.get('rbac')!;
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = createBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { namespaceSlug, slug, type, visibility } = parsed.data;

    const ns = await findNamespaceBySlug(db, namespaceSlug);
    if (!ns) throw new AssetError(assetErrorCodes.namespaceNotFound);
    const allowed = await rbac.can(principal.userId, PERMISSIONS.assetPublish, {
      namespaceId: ns.id,
    });
    if (!allowed) throw new AuthError('auth.forbidden');

    const row = await createAsset(db, {
      namespaceSlug,
      slug,
      type,
      ownerId: principal.userId,
      visibility,
    });
    await deps.audit({
      ...c.get('requestContext'),
      actorId: principal.userId,
      action: 'asset.register',
      targetType: 'asset',
      targetId: String(row.id),
      detail: { namespaceSlug, slug, type },
    });
    return c.json(assetItem(row, namespaceSlug), 201);
  });

  // GET /api/assets（T3：登录列表——读面可见 SQL 过滤；M3 全文搜索不在此）
  app.get('/', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const rbac = c.get('rbac')!;
    const parsed = listQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { limit, offset, nsSlug, type, visibility } = parsed.data;
    const platformRoles = await rbac.platformRolesOf(principal.userId);

    const { items, total } = await listViewableAssets(db, {
      limit,
      offset,
      namespaceSlug: nsSlug,
      type,
      visibility,
      viewer: { userId: principal.userId, isSuperAdmin: platformRoles.includes('SUPER_ADMIN') },
    });
    return c.json({ items: items.map((i) => assetItem(i, i.namespaceSlug)), total, limit, offset });
  });

  // GET /api/assets/{ns}/{slug}（T3：详情——PUBLIC 匿名可读）
  // 读面语义对齐 skillhub（SkillQueryService.getSkillDetail 分层）：
  //   ns 不存在 / asset 不存在（含 HIDDEN/ARCHIVED 非超管）→ 404 asset.not_found
  //   ns ARCHIVED 且非成员 → 403 asset.namespace_archived（error.namespace.archived 对齐）
  //   visibility 拒（PRIVATE/NAMESPACE_ONLY）→ 403 asset.access_denied（error.skill.access.denied 对齐）
  app.get('/:nsSlug/:slug', async (c) => {
    const nsSlug = c.req.param('nsSlug');
    const slug = c.req.param('slug');
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);

    const { viewerId, namespaceRole, isSuperAdmin } = await viewerContext(c, ns.id);
    // SUPER_ADMIN 短路（05 §6.3：HIDDEN/ARCHIVED 治理可见）
    if (isSuperAdmin) return c.json(assetItem(row, nsSlug));
    // 活跃面不存在：HIDDEN/ARCHIVED 资产对普通用户如不存在（resolveVisibleSkill 语义）
    if (row.status !== 'ACTIVE') throw new AssetError(assetErrorCodes.notFound);
    // 空间归档明示（skillhub error.namespace.archived）
    if (ns.status === 'ARCHIVED' && namespaceRole === null) {
      throw new AssetError(assetErrorCodes.namespaceArchived);
    }
    // visibility 拒 → 403 明示（存在但无权——skillhub error.skill.access.denied）
    if (
      !canViewAsset({
        nsStatus: ns.status,
        assetStatus: row.status,
        visibility: row.visibility,
        ownerId: row.ownerId,
        viewerId,
        namespaceRole,
        isSuperAdmin: false,
      })
    ) {
      throw new AssetError(assetErrorCodes.accessDenied);
    }
    return c.json(assetItem(row, nsSlug)); // nsSlug 已过 slugSchema 校验（path 即坐标）
  });

  // PATCH /api/assets/{ns}/{slug}（T4：visibility 修改——Q3；owner 或空间 ADMIN+）
  app.patch('/:nsSlug/:slug', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    await assertManageable(c, ns, row);

    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = visibilityBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { visibility } = parsed.data;
    const from = row.visibility;

    const [updated] = await db
      .update(asset)
      .set({ visibility, updatedBy: principal.userId })
      .where(eq(asset.id, row.id))
      .returning();
    await deps.audit({
      ...c.get('requestContext'),
      actorId: principal.userId,
      action: 'asset.visibility_update',
      targetType: 'asset',
      targetId: String(row.id),
      detail: { from, to: visibility },
    });
    return c.json(assetItem(updated!, nsSlug));
  });

  // PATCH /api/assets/{ns}/{slug}/status（T4：状态治理——05 §6.4 asset:manage；
  // owner 下架自己资产 / ADMIN+ 治理空间内；HIDDEN/ARCHIVED 即从活跃读面消失）
  app.patch('/:nsSlug/:slug/status', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    await assertManageable(c, ns, row);

    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = statusBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { status } = parsed.data;
    const from = row.status;

    const [updated] = await db
      .update(asset)
      .set({ status, updatedBy: principal.userId })
      .where(eq(asset.id, row.id))
      .returning();
    await deps.audit({
      ...c.get('requestContext'),
      actorId: principal.userId,
      action: 'asset.status_update',
      targetType: 'asset',
      targetId: String(row.id),
      detail: { from, to: status },
    });
    return c.json(assetItem(updated!, nsSlug));
  });

  // DELETE /api/assets/{ns}/{slug}（T4：资产删除——Q5 纠错非治理）
  // 仅无 PUBLISHED 版本可删（防已分发资产静默移除）；事务删行 + 事后存储清理（孤儿文件容忍：
  // 存储删失败不阻断行删除——残留文件无害可后清）
  app.delete('/:nsSlug/:slug', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    await assertManageable(c, ns, row);

    const versions = await db
      .select({ id: assetVersion.id, status: assetVersion.status })
      .from(assetVersion)
      .where(eq(assetVersion.assetId, row.id));
    if (versions.some((v) => v.status === 'PUBLISHED')) {
      throw new AssetError(assetErrorCodes.hasPublished);
    }

    const versionIds = versions.map((v) => v.id);
    const fileKeys: string[] = [];
    await db.transaction(async (tx) => {
      if (versionIds.length > 0) {
        const files = await tx
          .select({ storageKey: assetFile.storageKey })
          .from(assetFile)
          .where(inArray(assetFile.versionId, versionIds));
        fileKeys.push(...files.map((f) => f.storageKey));
        await tx.delete(assetFile).where(inArray(assetFile.versionId, versionIds));
        await tx.delete(assetVersion).where(inArray(assetVersion.id, versionIds));
      }
      await tx.delete(asset).where(eq(asset.id, row.id));
    });
    // 行删除成功后清理存储（deleteMany 容错：失败残留孤儿文件，不影响删除语义）
    if (fileKeys.length > 0) {
      await deps.storage.deleteMany(fileKeys).catch(() => {});
    }
    await deps.audit({
      ...c.get('requestContext'),
      actorId: principal.userId,
      action: 'asset.delete',
      targetType: 'asset',
      targetId: String(row.id),
      detail: { namespaceSlug: nsSlug, slug, versionCount: versionIds.length },
    });
    return c.body(null, 204);
  });

  // POST /api/assets/{ns}/{slug}/versions（T13：multipart 上传——design §6 全链）
  // 权限 = asset:publish（空间成员，rbac.can 含 FROZEN 拒写——与注册同判定）；
  // 限流 = 每用户 10 次/分钟（skillhub publish 同构）；413 = 包体超上限前置（multipart）；
  // 校验失败 400 = 首错误码 + issues 全量（UploadValidationError 特异响应）
  app.post('/:nsSlug/:slug/versions', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    if (!slugSchema.safeParse(nsSlug).success || !slugSchema.safeParse(slug).success) {
      throw new AssetError(assetErrorCodes.notFound);
    }

    const rl = deps.uploadRateLimiter.hit(`asset-upload:${principal.userId}`);
    if (!rl.allowed) {
      return c.json({ code: 'auth.rate_limited', message: 'upload rate limited', retryAfterSec: rl.retryAfterSec }, 429);
    }

    // multipart 解析（file 必填 + version 必填 + changelog 可选）
    const body = await c.req.parseBody();
    const rawFile = body['file'];
    if (!(rawFile instanceof File) || rawFile.size === 0) {
      return c.json({ code: 'request.invalid', message: 'multipart field "file" (zip) is required' }, 400);
    }
    const rawVersion = typeof body['version'] === 'string' ? body['version'] : undefined;
    const versionParsed = versionFieldSchema.safeParse(rawVersion);
    if (!versionParsed.success) {
      return c.json({ code: 'request.invalid', message: 'version must be semver (e.g. 1.0.0)' }, 400);
    }
    const rawChangelog = typeof body['changelog'] === 'string' ? body['changelog'] : undefined;
    const changelogParsed = changelogFieldSchema.safeParse(rawChangelog);
    if (!changelogParsed.success) {
      return c.json({ code: 'request.invalid', message: 'changelog too long (≤4096)' }, 400);
    }

    // 413 前置：包体字节 > 总包上限（config/env 单源——02 §3.3 10MiB）
    const env = getEnv();
    if (rawFile.size > env.ASSET_PACKAGE_MAX_BYTES) {
      throw new AssetError(assetErrorCodes.packageTooLarge);
    }
    const fileBuffer = Buffer.from(await rawFile.arrayBuffer());

    // 坐标 → 权限（asset:publish 空间成员——rbac.can 含空间状态/账号判定）
    const ns = await findNamespaceBySlug(db, nsSlug);
    if (!ns) throw new AssetError(assetErrorCodes.notFound);
    const rbac = c.get('rbac')!;
    const can = await rbac.can(principal.userId, PERMISSIONS.assetPublish, { namespaceId: ns.id });
    if (!can) throw new AuthError('auth.forbidden');
    const [assetRow] = await db
      .select({ id: asset.id, type: asset.type })
      .from(asset)
      .where(and(eq(asset.namespaceId, ns.id), eq(asset.slug, slug)));
    if (!assetRow) throw new AssetError(assetErrorCodes.notFound);

    try {
      const created = await createVersion(db, deps.storage, deps.audit, {
        asset: { id: assetRow.id, namespaceId: ns.id, type: assetRow.type },
        uploaderId: principal.userId,
        file: fileBuffer,
        version: versionParsed.data,
        changelog: changelogParsed.data,
      });
      return c.json(created, 201);
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return c.json(
          { code: err.issues[0]?.code ?? 'validation_failed', issues: err.issues },
          400,
        );
      }
      throw err;
    }
  });

  return app;
}
