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
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { AssetError, assetErrorCodes, UploadValidationError } from '../assets/errors.js';
import { canManageAsset } from '../assets/manage.js';
import {
  createAsset,
  findNamespaceBySlug,
  getAsset,
  listViewableAssets,
  loadAssetItemMeta,
  type AssetItemMeta,
  type AssetRow,
  type AssetViewerContext,
} from '../assets/service.js';
import { canViewAsset } from '../assets/visibility.js';
import { createVersion, deleteVersion } from '../assets/versions.js';
import { getVersion, listVersions } from '../assets/version-read.js';
import { AuthError } from '../auth/errors.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { ReviewError, reviewErrorCodes } from '../review/errors.js';
import { canSubmitReview, submitVersion } from '../review/service.js';
import { LabelError, labelErrorCodes } from '../labels/errors.js';
import { canYank, yankVersion } from '../assets/yank.js';
import { decideDownload, resolveDownload } from '../assets/download.js';
import { attachLabel, detachLabel, labelsOfAsset } from '../labels/service.js';
import { labelSlugSchema } from '../labels/service.js';
import { getEnv } from '../config/env.js';
import type { Db } from '../db/client.js';
import {
  asset,
  assetFile,
  assetStatusSchema,
  assetTypeSchema,
  assetVersion,
  reviewTask,
  type NamespaceRole,
  visibilitySchema,
} from '../db/schema/index.js';
import type { ObjectStorage } from '../storage/types.js';
import { requireAuth, assertTokenScoped } from './auth-middleware.js';
import { Readable } from 'node:stream';

export interface AssetRoutesDeps {
  db: Db;
  /** 审计写入器（资产动作 asset.* 埋点；T3-T4 起） */
  audit: AuditWriter;
  /** 资产删除连带存储清理（deleteMany） */
  storage: ObjectStorage;
  /** 上传限流（每用户窗口——skillhub publish=10 同构；独立实例防与登录共享挤占） */
  uploadRateLimiter: RateLimiter;
  /** 下载限流（design §7.2 G9——60/分·IP 匿名公开下载面；独立实例；缺省工厂内兜底） */
  downloadRateLimiter?: RateLimiter;
}

/** 上传限流配置（T13：10 次/分钟·每用户——常量装配于 app.ts 独立实例） */
export const UPLOAD_RATE_LIMIT = { windowMs: 60_000, max: 10 } as const;

/** 下载限流配置（M3 design §7.2 G9：60 次/分钟·IP——匿名公开下载面；env 可配同构） */
export const DOWNLOAD_RATE_LIMIT = { windowMs: 60_000, max: 60 } as const;

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  nsSlug: z.string().trim().min(1).max(64).optional(),
  type: assetTypeSchema.optional(),
  visibility: visibilitySchema.optional(),
  /** T12 全文检索（design §6 R12） */
  q: z.string().trim().min(1).max(100).optional(),
  /** T12 label 多值 OR（06 §4——?label=a&label=b；上限 20 防滥用） */
  label: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
});

/** 版本列表分页（T14——独立小 schema：无 ns/type 过滤） */
const versionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
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

/** 序列化响应形状（详情/注册/列表共用；坐标回显自足——含 namespaceSlug）。
 * M4a R5/R6：meta（latest 版本投影 + owner 显示名）为可选注入——缺省（注册场景）字段 null。 */
function assetItem(row: AssetRow, namespaceSlug: string, meta?: AssetItemMeta | null) {
  return {
    id: row.id,
    namespaceId: row.namespaceId,
    namespaceSlug,
    slug: row.slug,
    type: row.type,
    visibility: row.visibility,
    status: row.status,
    ownerId: row.ownerId,
    /** 当前版本指针（M3 起 approve/yank 维护——详情暴露供消费者取 latest） */
    latestVersionId: row.latestVersionId,
    /** R5：latest 版本展示投影（latest_version join——批注入防 N+1） */
    latestVersion: meta?.latestVersion ?? null,
    latestName: meta?.latestName ?? null,
    latestDescription: meta?.latestDescription ?? null,
    /** R6：owner 显示名（user_account.displayName——LDAP 建号同步 05 §3.1） */
    ownerDisplayName: meta?.ownerDisplayName ?? null,
    downloadCount: row.downloadCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** viewer 上下文组装（仅登录时查询；匿名 → role null + 非超管 + 非审核角色） */
async function viewerContext(
  c: import('hono').Context,
  namespaceId: number,
): Promise<{ viewerId: string | null; namespaceRole: NamespaceRole | null; isSuperAdmin: boolean; isPlatformReviewer: boolean }> {
  const principal = c.get('principal');
  if (!principal) return { viewerId: null, namespaceRole: null, isSuperAdmin: false, isPlatformReviewer: false };
  const rbac = c.get('rbac')!;
  const roles = await rbac.getNamespaceRoles(principal.userId, namespaceId);
  const platformRoles = await rbac.platformRolesOf(principal.userId);
  return {
    viewerId: principal.userId,
    namespaceRole: (roles[0] as NamespaceRole | undefined) ?? null,
    isSuperAdmin: platformRoles.includes('SUPER_ADMIN'),
    isPlatformReviewer: platformRoles.includes('ASSET_ADMIN'),
  };
}

/**
 * 资产读面前置链（detail + versions 端点共用——403/404 分层语义单点，design §7）：
 * SUPER_ADMIN 短路 → 非 ACTIVE 404（活跃面不存在）→ ns ARCHIVED 非成员 403
 * namespace_archived → visibility 拒 403 access_denied。返回 viewer 上下文（授权者身份）。
 */
async function assertAssetReadable(
  c: import('hono').Context,
  ns: { id: number; status: string },
  row: { status: string; visibility: string; ownerId: string },
): Promise<{ viewerId: string | null; namespaceRole: NamespaceRole | null; isSuperAdmin: boolean; isPlatformReviewer: boolean }> {
  const viewer = await viewerContext(c, ns.id);
  if (viewer.isSuperAdmin) return viewer;
  if (row.status !== 'ACTIVE') throw new AssetError(assetErrorCodes.notFound);
  if (ns.status === 'ARCHIVED' && viewer.namespaceRole === null) {
    throw new AssetError(assetErrorCodes.namespaceArchived);
  }
  if (
    !canViewAsset({
      nsStatus: ns.status,
      assetStatus: row.status,
      visibility: row.visibility,
      ownerId: row.ownerId,
      viewerId: viewer.viewerId,
      namespaceRole: viewer.namespaceRole,
      isSuperAdmin: false,
    })
  ) {
    throw new AssetError(assetErrorCodes.accessDenied);
  }
  return viewer;
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
  // R14 scope 交集先于超管短路（superAdmin + 收窄 scope = 收窄生效——design §8「无 scope 概念」
  // 仅指无码超管面如 label 管理；管理写面有 asset:manage 码可交）
  assertTokenScoped(c, PERMISSIONS.assetManage);
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
  // 下载限流兜底（测试 buildApp 可不传——app 工厂装配常量实例）
  const downloadRateLimiter = deps.downloadRateLimiter ?? new InMemoryRateLimiter(DOWNLOAD_RATE_LIMIT.windowMs, DOWNLOAD_RATE_LIMIT.max);

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
    assertTokenScoped(c, PERMISSIONS.assetPublish); // T15：token scope 交集（R14）

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

  // GET /api/assets（M4a R4：匿名放行——viewer 匿名短路 PUBLIC-only；登录态行为零变化）
  app.get('/', async (c) => {
    const principal = c.get('principal') ?? null;
    const rbac = c.get('rbac')!;
    const query = c.req.query();
    const parsed = listQuerySchema.safeParse({ ...query, label: c.req.queries('label') ?? undefined });
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { limit, offset, nsSlug, type, visibility, q, label } = parsed.data;
    const platformRoles = principal ? await rbac.platformRolesOf(principal.userId) : [];
    const viewer: AssetViewerContext = {
      userId: principal?.userId ?? null,
      isSuperAdmin: platformRoles.includes('SUPER_ADMIN'),
    };
    const { items, total } = await listViewableAssets(db, {
      limit,
      offset,
      namespaceSlug: nsSlug,
      type,
      visibility,
      q,
      labelSlugs: label,
      viewer,
    });
    // R5/R6：批注入 latest 版本投影 + owner 显示名（两条 inArray 防 N+1）
    const metas = await loadAssetItemMeta(db, items);
    return c.json({
      items: items.map((i) => assetItem(i, i.namespaceSlug, metas.get(i.id))),
      total,
      limit,
      offset,
    });
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
    await assertAssetReadable(c, ns, row); // 读面 403/404 分层（design §7）
    // 详情补 labels[]（06 §5.3——挂载 slug 列表；列表项不含）
    const labels = await labelsOfAsset(db, row.id);
    // R5/R6：latest 版本投影 + owner 显示名（详情单行也走批函数——同一语义）
    const metaMap = await loadAssetItemMeta(db, [row]);
    return c.json({ ...assetItem(row, nsSlug, metaMap.get(row.id)), labels });
  });

  // GET /api/assets/{ns}/{slug}/versions（T14：版本列表——Q1 DRAFT 授权过滤）
  // 资产读面前置（403/404 分层）→ 版本状态授权（DRAFT 仅 owner/上传者/空间 ADMIN+；
  // 无权者列表过滤——不泄露 DRAFT 存在）
  app.get('/:nsSlug/:slug/versions', async (c) => {
    const nsSlug = c.req.param('nsSlug');
    const slug = c.req.param('slug');
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    const viewer = await assertAssetReadable(c, ns, row);
    const query = versionListQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      return c.json({ code: 'request.invalid', message: 'invalid pagination params' }, 400);
    }
    const { limit, offset } = query.data;
    const { items, total } = await listVersions(db, row.id, row.ownerId, viewer, { limit, offset });
    return c.json({ items, total, limit, offset });
  });

  // GET /api/assets/{ns}/{slug}/versions/{version}（T14：版本详情——Q1 授权）
  // 详情含 manifest/投影/文件清单（sha256 可核对——design §6）；三态：不存在 404 /
  // 存在但无预览权 400 version_not_published（skillhub notPublished 对齐——明示）/
  // 授权 200。列表仍过滤（skillhub listVersions 同构：授权者全见，其他仅 PUBLISHED）。
  app.get('/:nsSlug/:slug/versions/:version', async (c) => {
    const nsSlug = c.req.param('nsSlug');
    const slug = c.req.param('slug');
    const version = c.req.param('version');
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    const viewer = await assertAssetReadable(c, ns, row);
    const detail = await getVersion(db, row.id, row.ownerId, version, viewer);
    if (detail === null) throw new AssetError(assetErrorCodes.notFound);
    if (detail === 'restricted') throw new AssetError(assetErrorCodes.versionNotPublished);
    return c.json(detail);
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

  // DELETE /api/assets/{ns}/{slug}（T4：资产删除——Q5 纠错非治理；M3 R10 条件升级）
  // 无 PUBLISHED 且无 YANKED 版本才可删（曾分发即留档——has_yanked 400）；事务删
  // review_task/file/version/asset + 事后存储清理（孤儿文件容忍：存储删失败不阻断行删除）
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
    if (versions.some((v) => v.status === 'YANKED')) {
      throw new AssetError(assetErrorCodes.hasYanked); // R10：曾分发即留档（design §4.2）
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
        // M3：review_task 引用版本无 ON DELETE——删前显式清（审核事件留 audit_log）
        await tx.delete(reviewTask).where(inArray(reviewTask.assetVersionId, versionIds));
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
    assertTokenScoped(c, PERMISSIONS.assetPublish); // T15：token scope 交集
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

  // DELETE /api/assets/{ns}/{slug}/versions/{version}（M3 T9：删除面分治——design §3.4 R5）
  // 判定序：版本 404 → 空间写门（ns ACTIVE，owner/上传者亦不能绕过空间冻结）→ 状态门
  // （禁删态 PENDING_REVIEW/PUBLISHED/YANKED → 400 version_not_deletable——替代 M2 draft_only）
  // → 身份面（owner/空间 ADMIN+ 可删 DRAFT/SCAN_FAILED/REJECTED/UPLOADED；上传者本人仅
  // DRAFT/SCAN_FAILED——草稿族例外扩展）。删除连带 review_task/存储清理（deleteVersion）。
  app.delete('/:nsSlug/:slug/versions/:version', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const version = c.req.param('version')!;
    if (
      !slugSchema.safeParse(nsSlug).success ||
      !slugSchema.safeParse(slug).success ||
      !versionFieldSchema.safeParse(version).success
    ) {
      throw new AssetError(assetErrorCodes.notFound);
    }
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    const [versionRow] = await db
      .select({ id: assetVersion.id, status: assetVersion.status, createdBy: assetVersion.createdBy })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, row.id), eq(assetVersion.version, version)));
    if (!versionRow) throw new AssetError(assetErrorCodes.notFound);

    const viewer = await viewerContext(c, ns.id);
    if (!viewer.isSuperAdmin) {
      if (ns.status !== 'ACTIVE') throw new AuthError('auth.forbidden'); // 空间写门（05 §6.3）
    }

    // 状态门：禁删态（R5 分治——PENDING_REVIEW 审核中防内容蒸发/PUBLISHED 已分发/YANKED 留档）
    const DELETABLE_UPLOADER: ReadonlySet<string> = new Set(['DRAFT', 'SCAN_FAILED']);
    const DELETABLE_MANAGER: ReadonlySet<string> = new Set(['DRAFT', 'SCAN_FAILED', 'REJECTED', 'UPLOADED']);
    const status = versionRow.status;
    if (!DELETABLE_UPLOADER.has(status) && !DELETABLE_MANAGER.has(status)) {
      throw new AssetError(assetErrorCodes.versionNotDeletable);
    }

    // 身份面：owner/空间 ADMIN+（canManageAsset）删 REJECTED/UPLOADED + 草稿族；
    // 上传者本人仅删自己的 DRAFT/SCAN_FAILED（M2 例外对称扩展）
    const manager = canManageAsset({
      ownerId: row.ownerId,
      viewerId: principal.userId,
      namespaceRole: viewer.namespaceRole,
      isSuperAdmin: viewer.isSuperAdmin,
    });
    // R14：版本删除（含上传者本人草稿撤回）scope 交集——design §8 ②「删除 = asset:manage」
    assertTokenScoped(c, PERMISSIONS.assetManage);
    const uploaderRetract = DELETABLE_UPLOADER.has(status) && versionRow.createdBy === principal.userId;
    if (!manager && !uploaderRetract) throw new AuthError('auth.forbidden');

    await deleteVersion(db, deps.storage, deps.audit, {
      versionId: versionRow.id,
      assetId: row.id,
      actorId: principal.userId,
      version,
    });
    return c.body(null, 204);
  });

  // POST /api/assets/{ns}/{slug}/versions/{version}/submit（T7：提交审核——M3 design §3.1 R2）
  // 判定：版本 404 → 空间写门（ns ACTIVE——SUPER_ADMIN 短路）→ canSubmitReview
  // （can('review:submit', ns) 含 空间 ADMIN/OWNER + ASSET_ADMIN + SUPER_ADMIN；∪ 上传者
  // 本人例外 ∪ owner 本人——05 §6.4 + R2）→ submitVersion（前态/并发/version 递增事务）。
  app.post('/:nsSlug/:slug/versions/:version/submit', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const version = c.req.param('version')!;
    if (
      !slugSchema.safeParse(nsSlug).success ||
      !slugSchema.safeParse(slug).success ||
      !versionFieldSchema.safeParse(version).success
    ) {
      throw new AssetError(assetErrorCodes.notFound);
    }
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    const [versionRow] = await db
      .select({ id: assetVersion.id, version: assetVersion.version, status: assetVersion.status, createdBy: assetVersion.createdBy })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, row.id), eq(assetVersion.version, version)));
    if (!versionRow) throw new AssetError(assetErrorCodes.notFound);

    const viewer = await viewerContext(c, ns.id);
    if (!viewer.isSuperAdmin) {
      if (ns.status !== 'ACTIVE') throw new AuthError('auth.forbidden'); // 空间写门（05 §6.3）
    }
    const rbac = c.get('rbac')!;
    const hasReviewSubmit = await rbac.can(principal.userId, PERMISSIONS.reviewSubmit, { namespaceId: ns.id });
    assertTokenScoped(c, PERMISSIONS.reviewSubmit); // T15：token scope 交集（R14——scope 无码即拒）
    if (!canSubmitReview({ assetOwnerId: row.ownerId, versionCreatedBy: versionRow.createdBy, actorId: principal.userId, hasReviewSubmit })) {
      throw new ReviewError(reviewErrorCodes.accessDenied);
    }

    const out = await submitVersion(db, deps.audit, {
      asset: { id: row.id, namespaceId: ns.id, ownerId: row.ownerId },
      version: { id: versionRow.id, version: versionRow.version, status: versionRow.status, createdBy: versionRow.createdBy },
      submitterId: principal.userId,
    });
    return c.json({ taskId: out.taskId, reviewVersion: out.reviewVersion, status: 'PENDING_REVIEW' }, 201);
  });

  // POST /api/assets/{ns}/{slug}/versions/{version}/yank（T8：撤回分发——M3 design §4.1 R9）
  // 判定：版本 404 → 平台治理面（ASSET_ADMIN/SUPER_ADMIN——05 §6.4「撤回已发布版本」，
  // 非 owner/空间 ADMIN——治理最严面）→ reason 必填（400 yank_reason_required）→
  // yankVersion（YANKED 三列 + latest 重算事务 + 审计）。
  app.post('/:nsSlug/:slug/versions/:version/yank', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const version = c.req.param('version')!;
    if (
      !slugSchema.safeParse(nsSlug).success ||
      !slugSchema.safeParse(slug).success ||
      !versionFieldSchema.safeParse(version).success
    ) {
      throw new AssetError(assetErrorCodes.notFound);
    }
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    if (ns.status !== 'ACTIVE') throw new AuthError('auth.forbidden'); // 空间写门（05 §6.3）
    const [versionRow] = await db
      .select({ id: assetVersion.id, version: assetVersion.version, status: assetVersion.status })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, row.id), eq(assetVersion.version, version)));
    if (!versionRow) throw new AssetError(assetErrorCodes.notFound);

    const rbac = c.get('rbac')!;
    const platformRoles = await rbac.platformRolesOf(principal.userId);
    if (!canYank(platformRoles.includes('ASSET_ADMIN'), platformRoles.includes('SUPER_ADMIN'))) {
      throw new AuthError('auth.forbidden');
    }
    assertTokenScoped(c, PERMISSIONS.assetManage); // R14：yank 平台治理面 scope 交集（design §8 ②）
    const body = await c.req.json().catch(() => ({})) as { reason?: unknown };
    if (typeof body.reason !== 'string' || body.reason.trim() === '') {
      throw new AssetError(assetErrorCodes.yankReasonRequired);
    }

    const out = await yankVersion(db, deps.audit, {
      assetId: row.id,
      version: versionRow,
      actorId: principal.userId,
      reason: body.reason,
    });
    return c.json({ status: 'YANKED', latestVersionId: out.latestVersionId }, 200);
  });

  // PUT/DELETE /api/assets/{ns}/{slug}/labels/{labelSlug}（T11：挂载/移除——06 §3/§5.3）
  // 判定（design §5 R11）：label type 分判——RECOMMENDED = canManageAsset（owner/空间
  // ADMIN/OWNER——06 §3 挂载权限）+ SUPER_ADMIN 短路；PRIVILEGED = 仅 SUPER_ADMIN。
  // 幂等：重复挂 200 / 移除不存在 204。≤10 上限（06 §1）。
  app.put('/:nsSlug/:slug/labels/:labelSlug', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const labelSlug = c.req.param('labelSlug')!;
    if (!labelSlugSchema.safeParse(labelSlug).success) throw new LabelError(labelErrorCodes.notFound);
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    const viewer = await viewerContext(c, ns.id);
    if (!viewer.isSuperAdmin && ns.status !== 'ACTIVE') throw new AuthError('auth.forbidden'); // 空间写门
    const canManage = canManageAsset({
      ownerId: row.ownerId,
      viewerId: principal.userId,
      namespaceRole: viewer.namespaceRole,
      isSuperAdmin: viewer.isSuperAdmin,
    });
    // R14 scope：RECOMMENDED 挂载 = asset:manage（design §8 ②——service 分判内组合）
    const scopes = c.get('tokenScopes');
    const hasAssetManageScope = scopes === undefined || scopes === null || scopes.has(PERMISSIONS.assetManage);
    await attachLabel(db, deps.audit, {
      assetId: row.id,
      labelSlug,
      actorId: principal.userId,
      canManage,
      isSuperAdmin: viewer.isSuperAdmin,
      hasAssetManageScope,
    });
    return c.body(null, 204);
  });

  app.delete('/:nsSlug/:slug/labels/:labelSlug', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const labelSlug = c.req.param('labelSlug')!;
    if (!labelSlugSchema.safeParse(labelSlug).success) throw new LabelError(labelErrorCodes.notFound);
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    const viewer = await viewerContext(c, ns.id);
    if (!viewer.isSuperAdmin && ns.status !== 'ACTIVE') throw new AuthError('auth.forbidden');
    const canManage = canManageAsset({
      ownerId: row.ownerId,
      viewerId: principal.userId,
      namespaceRole: viewer.namespaceRole,
      isSuperAdmin: viewer.isSuperAdmin,
    });
    // R14 scope：移除挂载同挂载权（RECOMMENDED = asset:manage——service 分判内组合）
    const scopes = c.get('tokenScopes');
    const hasAssetManageScope = scopes === undefined || scopes === null || scopes.has(PERMISSIONS.assetManage);
    await detachLabel(db, deps.audit, {
      assetId: row.id,
      labelSlug,
      actorId: principal.userId,
      canManage,
      isSuperAdmin: viewer.isSuperAdmin,
      hasAssetManageScope,
    });
    return c.body(null, 204);
  });

  // GET /api/assets/{ns}/{slug}/versions/{version}/download（T14：包下载——design §7.2 R13）
  // 授权序：资产读面（403/404 分层）→ 版本五档判定（PUBLISHED 公开 / UPLOADED·PENDING_REVIEW
  // 预览授权集 / YANKED → 400 version_yanked / 其余 → 400 version_not_published）→
  // 限流（60/分·IP——design G9；匿名公开下载面）→ 计数（授权过即 ++）→
  // presigned 直链 302 / Local 服务端流式 200。下载不入审计。
  app.get('/:nsSlug/:slug/versions/:version/download', async (c) => {
    const nsSlug = c.req.param('nsSlug')!;
    const slug = c.req.param('slug')!;
    const version = c.req.param('version')!;
    if (
      !slugSchema.safeParse(nsSlug).success ||
      !slugSchema.safeParse(slug).success ||
      !versionFieldSchema.safeParse(version).success
    ) {
      throw new AssetError(assetErrorCodes.notFound);
    }
    const { ns, row } = await loadAssetBySlugs(db, nsSlug, slug);
    const viewer = await assertAssetReadable(c, ns, row);
    const [versionRow] = await db
      .select({ id: assetVersion.id, status: assetVersion.status, createdBy: assetVersion.createdBy, bundleStorageKey: assetVersion.bundleStorageKey })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, row.id), eq(assetVersion.version, version)));
    if (!versionRow) throw new AssetError(assetErrorCodes.notFound);

    // 五档判定（design §7.2——错误码分派按 kind）
    const decision = decideDownload(versionRow.status, viewer, row.ownerId, versionRow);
    if (decision.kind === 'yanked') throw new AssetError(assetErrorCodes.versionYanked);
    if (decision.kind === 'not_published') throw new AssetError(assetErrorCodes.versionNotPublished);

    // 限流（下载独立实例——60/分·IP；design G9 数值）
    const clientIp = c.get('requestContext')?.clientIp ?? 'unknown';
    const rl = downloadRateLimiter.hit(`asset-download:${clientIp}`);
    if (!rl.allowed) {
      return c.json({ code: 'auth.rate_limited', message: 'download rate limited', retryAfterSec: rl.retryAfterSec }, 429);
    }

    const resolved = await resolveDownload(db, deps.storage, { assetId: row.id, versionRow });
    if (resolved.presignedUrl) {
      return c.redirect(resolved.presignedUrl, 302); // S3 直链路径
    }
    // Local 流式兜底：zip 字节流 + attachment（fetch Response——Node 全局类型含 BodyInit）
    const data = await deps.storage.get(resolved.bundleKey);
    const stream = data instanceof Buffer ? data : Readable.toWeb(data as import('node:stream').Readable);
    return new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${row.slug}-${version}.zip"`,
      },
    });
  });

  return app;
}
