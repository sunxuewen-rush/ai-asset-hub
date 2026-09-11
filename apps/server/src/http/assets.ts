/**
 * /api/assets 路由组（M2 T3-T4，design §3/§7/§9）：
 * POST 注册（M4-pre：登录即得——「注册资产 = 用户+」）· GET 列表（读面恒「活跃资产」面）·
 * GET 详情（读面仅由 status 判定；ACTIVE 匿名可读）· PATCH status ·
 * DELETE（owner 本人 或 管理档，仅无 PUBLISHED）。
 *
 * 读面拒绝语义（design §7 → M4-pre S3 可见性删除后）：坐标不存在 / 非 ACTIVE → 404
 * （非 ACTIVE 仅 SUPER_ADMIN 可读，owner 与 管理档 同 404）；**无 403 可见性出口**
 * （access_denied 出口随可见性概念一并消失）。
 * 管理面判定（design §7/05 §6.4 → M4-pre §2.2 两层判定）：owner 本人 ∨ `role >= ADMIN`。
 */

import { Readable } from 'node:stream';
import { slugSchema } from '@ai-asset-hub/protocol';
import { and, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { decideDownload, resolveDownload } from '../assets/download.js';
import { AssetError, assetErrorCodes, UploadValidationError } from '../assets/errors.js';
import { canManageAsset } from '../assets/manage.js';
import {
  type AssetItemMeta,
  type AssetRow,
  createAsset,
  getAsset,
  listViewableAssets,
  loadAssetItemMeta,
} from '../assets/service.js';
import { compareVersions } from '../assets/version-compare.js';
import { readVersionFile } from '../assets/version-content.js';
import { getVersion, listVersions } from '../assets/version-read.js';
import { createVersion, deleteVersion } from '../assets/versions.js';
import { canYank, yankVersion } from '../assets/yank.js';
import type { AuditWriter } from '../audit/audit.js';
import { AuthError } from '../auth/errors.js';
import type { RateLimiter } from '../auth/rate-limit.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { ACCOUNT_ROLE, type AccountRole } from '../auth/rbac.js';
import { TOKEN_SCOPES } from '../auth/token-scopes.js';
import { getEnv } from '../config/env.js';
import type { Db } from '../db/client.js';
import {
  asset,
  assetFile,
  assetStatusSchema,
  assetTypeSchema,
  assetVersion,
  reviewTask,
} from '../db/schema/index.js';
import { LabelError, labelErrorCodes } from '../labels/errors.js';
import { attachLabel, detachLabel, labelSlugSchema, labelsOfAsset } from '../labels/service.js';
import { ReviewError, reviewErrorCodes } from '../review/errors.js';
import { canSubmitReview, submitVersion } from '../review/service.js';
import type { ObjectStorage } from '../storage/types.js';
import { assertTokenScoped, requireAuth } from './auth-middleware.js';

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
  type: assetTypeSchema.optional(),
  /** T12 全文检索（design §6 R12） */
  q: z.string().trim().min(1).max(100).optional(),
  /** T12 label 多值 OR（06 §4——?label=a&label=b；上限 20 防滥用） */
  label: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
});

/** 版本列表分页（T14——独立小 schema：无 type 过滤） */
const versionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** POST /api/assets body（注册；M4-pre S3：无可见性字段） */
const createBodySchema = z.object({
  slug: slugSchema,
  type: assetTypeSchema,
});

/** 版本号（01 §3 semver——基础三段 + 可选 pre-release/build 限定） */
const versionFieldSchema = z
  .string()
  .max(64)
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/, 'request.invalid');

/** changelog 长度界（防滥——text 列无界） */
const changelogFieldSchema = z.string().max(4096).optional();

/** PATCH /:slug/status body（状态治理——05 §6.4 asset:manage） */
const statusBodySchema = z.object({ status: assetStatusSchema });

/** 序列化响应形状（详情/注册/列表共用；坐标 = 全局唯一裸 `slug`，M4-pre §2.3）。
 * M4a R5/R6：meta（latest 版本投影 + owner 显示名）为可选注入——缺省（注册场景）字段 null。 */
function assetItem(row: AssetRow, meta?: AssetItemMeta | null) {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
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

/** viewer 上下文组装（仅登录时查询一次；匿名 → GUEST 档 + 非超管 + 非审核角色） */
async function viewerContext(c: import('hono').Context): Promise<{
  viewerId: string | null;
  viewerRole: AccountRole;
  isSuperAdmin: boolean;
  isPlatformReviewer: boolean;
}> {
  const principal = c.get('principal');
  if (!principal)
    return {
      viewerId: null,
      viewerRole: ACCOUNT_ROLE.GUEST,
      isSuperAdmin: false,
      isPlatformReviewer: false,
    };
  const rbac = c.get('rbac')!;
  const role = (await rbac.roleOf(principal.userId)) ?? ACCOUNT_ROLE.GUEST;
  return {
    viewerId: principal.userId,
    viewerRole: role,
    isSuperAdmin: role >= ACCOUNT_ROLE.SUPER_ADMIN,
    isPlatformReviewer: role >= ACCOUNT_ROLE.ADMIN,
  };
}

/**
 * 资产读面前置链（detail + versions 端点共用——403/404 分层语义单点，design §7）：
 * SUPER_ADMIN 短路 → 非 ACTIVE 404（活跃面不存在）。
 * M4-pre S3：可见性删除后**无 403 出口**——ACTIVE 即公开可读（含匿名）。
 * 返回 viewer 上下文（授权者身份）。M4-pre：空间归档门随空间删除。
 */
async function assertAssetReadable(
  c: import('hono').Context,
  row: { status: string; ownerId: string },
): Promise<{
  viewerId: string | null;
  viewerRole: AccountRole;
  isSuperAdmin: boolean;
  isPlatformReviewer: boolean;
}> {
  const viewer = await viewerContext(c);
  if (viewer.isSuperAdmin) return viewer;
  if (row.status !== 'ACTIVE') throw new AssetError(assetErrorCodes.notFound);
  return viewer;
}

/** 坐标加载（管理端点共用：asset 不存在 → 404 asset.not_found） */
async function loadAssetBySlug(db: Db, slug: string) {
  if (!slugSchema.safeParse(slug).success) {
    throw new AssetError(assetErrorCodes.notFound);
  }
  const row = await getAsset(db, slug);
  if (!row) throw new AssetError(assetErrorCodes.notFound);
  return row;
}

/**
 * 管理面门（requireAuth 后）：canManageAsset（owner 本人 ∨ `role >= ADMIN`——M4-pre §2.2）；
 * R14 token scope 交集（asset:manage）。失败统一 auth.forbidden（写管理面无 404 语义）。
 */
async function assertManageable(
  c: import('hono').Context,
  row: { ownerId: string },
): Promise<{ isSuperAdmin: boolean }> {
  const principal = c.get('principal')!;
  const viewer = await viewerContext(c);
  // R14 scope 交集先于超管短路（superAdmin + 收窄 scope = 收窄生效——design §8「无 scope 概念」
  // 仅指无码超管面如 label 管理；管理写面有 asset:manage 码可交）
  assertTokenScoped(c, TOKEN_SCOPES.assetManage);
  if (viewer.isSuperAdmin) return { isSuperAdmin: true };
  const allowed = canManageAsset({
    ownerId: row.ownerId,
    viewerId: principal.userId,
    viewerRole: viewer.viewerRole,
  });
  if (!allowed) throw new AuthError('auth.forbidden');
  return { isSuperAdmin: false };
}

export function createAssetRoutes(deps: AssetRoutesDeps): Hono {
  const app = new Hono();
  const { db } = deps;
  // 下载限流兜底（测试 buildApp 可不传——app 工厂装配常量实例）
  const downloadRateLimiter =
    deps.downloadRateLimiter ??
    new InMemoryRateLimiter(DOWNLOAD_RATE_LIMIT.windowMs, DOWNLOAD_RATE_LIMIT.max);

  // POST /api/assets（T3：注册——M4-pre §2.2「用户+」：requireAuth 保证账号 ACTIVE；
  // token scope = asset:publish（原「空间成员 + rbac.can FROZEN 拒写」判定已随空间删除））
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
    const { slug, type } = parsed.data;

    // M4-pre §2.2：注册资产 = `用户`+（requireAuth 已保证账号 ACTIVE）；坐标为全局唯一裸 slug
    assertTokenScoped(c, TOKEN_SCOPES.assetPublish); // T15：token scope 交集（R14）

    const row = await createAsset(db, {
      slug,
      type,
      ownerId: principal.userId,
    });
    await deps.audit({
      ...c.get('requestContext'),
      actorId: principal.userId,
      action: 'asset.register',
      targetType: 'asset',
      targetId: String(row.id),
      detail: { slug, type },
    });
    return c.json(assetItem(row), 201);
  });

  // GET /api/assets（M4a R4：匿名放行——列表恒 `status = ACTIVE` 面，与 viewer 身份无关；
  // M4-pre 后无可见性维度，登录态行为零变化）
  app.get('/', async (c) => {
    const principal = c.get('principal') ?? null;
    const query = c.req.query();
    const parsed = listQuerySchema.safeParse({
      ...query,
      label: c.req.queries('label') ?? undefined,
    });
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { limit, offset, type, q, label } = parsed.data;
    // M4-pre S3：列表恒「活跃资产」面，与 viewer 身份无关（可见性已删）
    const { items, total } = await listViewableAssets(db, {
      limit,
      offset,
      type,
      q,
      labelSlugs: label,
    });
    // R5/R6：批注入 latest 版本投影 + owner 显示名（两条 inArray 防 N+1）
    const metas = await loadAssetItemMeta(db, items);
    return c.json({
      items: items.map((i) => assetItem(i, metas.get(i.id))),
      total,
      limit,
      offset,
    });
  });

  // GET /api/assets/{slug}（T3：详情——PUBLIC 匿名可读）
  // 读面语义对齐 skillhub（SkillQueryService.getSkillDetail 分层）：
  //   asset 不存在（含 HIDDEN/ARCHIVED 非超管）→ 404 asset.not_found
  //   （M4-pre：空间归档语义消失，无 namespace_archived 出口）
  //   （M4-pre S3：可见性删除后无 403 出口——ACTIVE 即公开；非 ACTIVE 走上一行 404）
  app.get('/:slug', async (c) => {
    const slug = c.req.param('slug');
    const row = await loadAssetBySlug(db, slug);
    await assertAssetReadable(c, row); // 读面 403/404 分层（design §7）
    // 详情补 labels[]（06 §5.3——挂载 slug 列表；列表项不含）
    const labels = await labelsOfAsset(db, row.id);
    // R5/R6：latest 版本投影 + owner 显示名（详情单行也走批函数——同一语义）
    const metaMap = await loadAssetItemMeta(db, [row]);
    return c.json({ ...assetItem(row, metaMap.get(row.id)), labels });
  });

  // GET /api/assets/{slug}/versions（T14：版本列表——Q1 DRAFT 授权过滤）
  // 资产读面前置（403/404 分层）→ 版本状态授权（DRAFT 仅 owner/上传者/管理档；
  // 无权者列表过滤——不泄露 DRAFT 存在）
  app.get('/:slug/versions', async (c) => {
    const slug = c.req.param('slug');
    const row = await loadAssetBySlug(db, slug);
    const viewer = await assertAssetReadable(c, row);
    const query = versionListQuerySchema.safeParse(c.req.query());
    if (!query.success) {
      return c.json({ code: 'request.invalid', message: 'invalid pagination params' }, 400);
    }
    const { limit, offset } = query.data;
    const { items, total } = await listVersions(db, row.id, row.ownerId, viewer, { limit, offset });
    return c.json({ items, total, limit, offset });
  });

  // GET /api/assets/{slug}/versions/compare（M4a R9：行级版本对比——匿名）
  // 静态段 compare（RegExpRouter 静态优先——先于下方 :version 参数路由命中）；
  // from/to 缺省参数 400 request.invalid；版本不存在/无权语义见 compareVersions
  app.get('/:slug/versions/compare', async (c) => {
    const parsed = z
      .object({
        from: z.string().min(1).max(128),
        to: z.string().min(1).max(128),
      })
      .safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: 'invalid compare params' }, 400);
    }
    const row = await loadAssetBySlug(db, c.req.param('slug'));
    const viewer = await assertAssetReadable(c, row);
    const files = await compareVersions(db, deps.storage, {
      assetId: row.id,
      ownerId: row.ownerId,
      from: parsed.data.from,
      to: parsed.data.to,
      viewer,
    });
    return c.json({ files });
  });

  // GET /api/assets/{slug}/versions/{version}（T14：版本详情——Q1 授权）
  // 详情含 manifest/投影/文件清单（sha256 可核对——design §6）；三态：不存在 404 /
  // 存在但无预览权 400 version_not_published（skillhub notPublished 对齐——明示）/
  // 授权 200。列表仍过滤（skillhub listVersions 同构：授权者全见，其他仅 PUBLISHED）。
  app.get('/:slug/versions/:version', async (c) => {
    const slug = c.req.param('slug');
    const version = c.req.param('version');
    const row = await loadAssetBySlug(db, slug);
    const viewer = await assertAssetReadable(c, row);
    const detail = await getVersion(db, row.id, row.ownerId, version, viewer);
    if (detail === null) throw new AssetError(assetErrorCodes.notFound);
    if (detail === 'restricted') throw new AssetError(assetErrorCodes.versionNotPublished);
    return c.json(detail);
  });

  // GET /api/assets/{slug}/versions/{version}/files/*（M4a R8：文件内容读取——匿名预览）
  // 授权 = 下载判定同语义（PUBLISHED 公开 / 预览集 / YANKED 400——文件内容是下载前奏）；
  // filePath 走 db 参数化 uq 查询（天然防穿越）+ 显式路径安全校验
  app.get('/:slug/versions/:version/files/*', async (c) => {
    const slug = c.req.param('slug');
    const version = c.req.param('version');
    // hono '*' 通配匹配但不暴露捕获值——自 URL 取 files/ 后段（保持契约 path 格式；
    // URL 编码段解码后交 assertSafeReadPath 校验 + db 参数化查询）
    const rawPath = new URL(c.req.url).pathname;
    const marker = '/files/';
    const fpStart = rawPath.indexOf(marker);
    const filePath = fpStart >= 0 ? decodeURIComponent(rawPath.slice(fpStart + marker.length)) : '';
    const row = await loadAssetBySlug(db, slug);
    const viewer = await assertAssetReadable(c, row); // 读面 404 分层（M4-pre S3：无 403 出口）
    const content = await readVersionFile(db, deps.storage, {
      assetId: row.id,
      ownerId: row.ownerId,
      version,
      filePath,
      viewer,
    });
    return c.json(content);
  });

  // PATCH /api/assets/:slug/status（T4：状态治理——05 §6.4 asset:manage；
  // owner 下架自己资产 / 管理档治理全站；HIDDEN/ARCHIVED 即从活跃读面消失）
  app.patch('/:slug/status', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const slug = c.req.param('slug')!;
    const row = await loadAssetBySlug(db, slug);
    await assertManageable(c, row);

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
    return c.json(assetItem(updated!));
  });

  // DELETE /api/assets/{slug}（T4：资产删除——Q5 纠错非治理；M3 R10 条件升级）
  // 无 PUBLISHED 且无 YANKED 版本才可删（曾分发即留档——has_yanked 400）；事务删
  // review_task/file/version/asset + 事后存储清理（孤儿文件容忍：存储删失败不阻断行删除）
  app.delete('/:slug', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const slug = c.req.param('slug')!;
    const row = await loadAssetBySlug(db, slug);
    await assertManageable(c, row);

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
      detail: { slug, versionCount: versionIds.length },
    });
    return c.body(null, 204);
  });

  // POST /api/assets/{slug}/versions（T13：multipart 上传——design §6 全链）
  // 权限 = owner 本人 ∨ 管理档（M4-pre D4——原「空间成员 + rbac.can FROZEN 拒写」已随空间删除）；
  // 限流 = 每用户 10 次/分钟（skillhub publish 同构）；413 = 包体超上限前置（multipart）；
  // 校验失败 400 = 首错误码 + issues 全量（UploadValidationError 特异响应）
  app.post('/:slug/versions', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const slug = c.req.param('slug')!;
    if (!slugSchema.safeParse(slug).success) {
      throw new AssetError(assetErrorCodes.notFound);
    }

    const rl = deps.uploadRateLimiter.hit(`asset-upload:${principal.userId}`);
    if (!rl.allowed) {
      return c.json(
        {
          code: 'auth.rate_limited',
          message: 'upload rate limited',
          retryAfterSec: rl.retryAfterSec,
        },
        429,
      );
    }

    // multipart 解析（file 必填 + version 必填 + changelog 可选）
    const body = await c.req.parseBody();
    const rawFile = body['file'];
    if (!(rawFile instanceof File) || rawFile.size === 0) {
      return c.json(
        { code: 'request.invalid', message: 'multipart field "file" (zip) is required' },
        400,
      );
    }
    const rawVersion = typeof body['version'] === 'string' ? body['version'] : undefined;
    const versionParsed = versionFieldSchema.safeParse(rawVersion);
    if (!versionParsed.success) {
      return c.json(
        { code: 'request.invalid', message: 'version must be semver (e.g. 1.0.0)' },
        400,
      );
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

    // 坐标 → 权限：上传草稿版本 = owner 本人 ∨ 管理档（M4-pre §2.2「版本级操作归 owner/管理」；
    // 原空间成员面随空间删除）
    const assetRow = await loadAssetBySlug(db, slug);
    const can = canManageAsset({
      ownerId: assetRow.ownerId,
      viewerId: principal.userId,
      viewerRole: (await c.get('rbac')!.roleOf(principal.userId)) ?? ACCOUNT_ROLE.GUEST,
    });
    if (!can) throw new AuthError('auth.forbidden');
    assertTokenScoped(c, TOKEN_SCOPES.assetPublish); // T15：token scope 交集

    try {
      const created = await createVersion(db, deps.storage, deps.audit, {
        asset: { id: assetRow.id, type: assetRow.type },
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

  // DELETE /api/assets/{slug}/versions/{version}（M3 T9：删除面分治——design §3.4 R5）
  // 判定序：版本 404 → 状态门（M4-pre：空间写门已随空间删除）
  // （禁删态 PENDING_REVIEW/PUBLISHED/YANKED → 400 version_not_deletable——替代 M2 draft_only）
  // → 身份面（owner/管理档可删 DRAFT/SCAN_FAILED/REJECTED/UPLOADED；上传者本人仅
  // DRAFT/SCAN_FAILED——草稿族例外扩展）。删除连带 review_task/存储清理（deleteVersion）。
  app.delete('/:slug/versions/:version', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const slug = c.req.param('slug')!;
    const version = c.req.param('version')!;
    if (!slugSchema.safeParse(slug).success || !versionFieldSchema.safeParse(version).success) {
      throw new AssetError(assetErrorCodes.notFound);
    }
    const row = await loadAssetBySlug(db, slug);
    const [versionRow] = await db
      .select({
        id: assetVersion.id,
        status: assetVersion.status,
        createdBy: assetVersion.createdBy,
      })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, row.id), eq(assetVersion.version, version)));
    if (!versionRow) throw new AssetError(assetErrorCodes.notFound);

    const viewer = await viewerContext(c);

    // 状态门：禁删态（R5 分治——PENDING_REVIEW 审核中防内容蒸发/PUBLISHED 已分发/YANKED 留档）
    const DELETABLE_UPLOADER: ReadonlySet<string> = new Set(['DRAFT', 'SCAN_FAILED']);
    const DELETABLE_MANAGER: ReadonlySet<string> = new Set([
      'DRAFT',
      'SCAN_FAILED',
      'REJECTED',
      'UPLOADED',
    ]);
    const status = versionRow.status;
    if (!DELETABLE_UPLOADER.has(status) && !DELETABLE_MANAGER.has(status)) {
      throw new AssetError(assetErrorCodes.versionNotDeletable);
    }

    // 身份面：owner/管理档（canManageAsset）删 REJECTED/UPLOADED + 草稿族；
    // 上传者本人仅删自己的 DRAFT/SCAN_FAILED（M2 例外对称扩展）
    const manager = canManageAsset({
      ownerId: row.ownerId,
      viewerId: principal.userId,
      viewerRole: viewer.viewerRole,
    });
    // R14：版本删除（含上传者本人草稿撤回）scope 交集——design §8 ②「删除 = asset:manage」
    assertTokenScoped(c, TOKEN_SCOPES.assetManage);
    const uploaderRetract =
      DELETABLE_UPLOADER.has(status) && versionRow.createdBy === principal.userId;
    if (!manager && !uploaderRetract) throw new AuthError('auth.forbidden');

    await deleteVersion(db, deps.storage, deps.audit, {
      versionId: versionRow.id,
      assetId: row.id,
      actorId: principal.userId,
      version,
    });
    return c.body(null, 204);
  });

  // POST /api/assets/{slug}/versions/{version}/submit（T7：提交审核——M3 design §3.1 R2）
  // 判定：版本 404 → canSubmitReview（M4-pre：空间写门已随空间删除）
  // （hasReviewSubmit = `role >= ADMIN`；∪ 上传者
  // 本人例外 ∪ owner 本人——05 §6.4 + R2）→ submitVersion（前态/并发/version 递增事务）。
  app.post('/:slug/versions/:version/submit', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const slug = c.req.param('slug')!;
    const version = c.req.param('version')!;
    if (!slugSchema.safeParse(slug).success || !versionFieldSchema.safeParse(version).success) {
      throw new AssetError(assetErrorCodes.notFound);
    }
    const row = await loadAssetBySlug(db, slug);
    const [versionRow] = await db
      .select({
        id: assetVersion.id,
        version: assetVersion.version,
        status: assetVersion.status,
        createdBy: assetVersion.createdBy,
      })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, row.id), eq(assetVersion.version, version)));
    if (!versionRow) throw new AssetError(assetErrorCodes.notFound);

    const viewer = await viewerContext(c);
    // M4-pre §2.2：提交版本进审核 = owner 本人 ∨ 管理档（原空间成员 + 权限码面消失）
    const hasReviewSubmit = viewer.viewerRole >= ACCOUNT_ROLE.ADMIN;
    assertTokenScoped(c, TOKEN_SCOPES.reviewSubmit); // T15：token scope 交集（R14——scope 无码即拒）
    if (
      !canSubmitReview({
        assetOwnerId: row.ownerId,
        versionCreatedBy: versionRow.createdBy,
        actorId: principal.userId,
        hasReviewSubmit,
      })
    ) {
      throw new ReviewError(reviewErrorCodes.accessDenied);
    }

    const out = await submitVersion(db, deps.audit, {
      asset: { id: row.id, ownerId: row.ownerId },
      version: {
        id: versionRow.id,
        version: versionRow.version,
        status: versionRow.status,
        createdBy: versionRow.createdBy,
      },
      submitterId: principal.userId,
    });
    return c.json(
      { taskId: out.taskId, reviewVersion: out.reviewVersion, status: 'PENDING_REVIEW' },
      201,
    );
  });

  // POST /api/assets/{slug}/versions/{version}/yank（T8：撤回分发——M3 design §4.1 R9）
  // 判定：版本 404 → 管理档（`role >= ADMIN`——05 §6.4「撤回已发布版本」，
  // 非 owner/管理档——治理最严面）→ reason 必填（400 yank_reason_required）→
  // yankVersion（YANKED 三列 + latest 重算事务 + 审计）。
  app.post('/:slug/versions/:version/yank', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const slug = c.req.param('slug')!;
    const version = c.req.param('version')!;
    if (!slugSchema.safeParse(slug).success || !versionFieldSchema.safeParse(version).success) {
      throw new AssetError(assetErrorCodes.notFound);
    }
    const row = await loadAssetBySlug(db, slug);
    const [versionRow] = await db
      .select({ id: assetVersion.id, version: assetVersion.version, status: assetVersion.status })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, row.id), eq(assetVersion.version, version)));
    if (!versionRow) throw new AssetError(assetErrorCodes.notFound);

    const rbac = c.get('rbac')!;
    const role = (await rbac.roleOf(principal.userId)) ?? ACCOUNT_ROLE.GUEST;
    if (!canYank(role >= ACCOUNT_ROLE.ADMIN, role >= ACCOUNT_ROLE.SUPER_ADMIN)) {
      throw new AuthError('auth.forbidden');
    }
    assertTokenScoped(c, TOKEN_SCOPES.assetManage); // R14：yank 平台治理面 scope 交集（design §8 ②）
    const body = (await c.req.json().catch(() => ({}))) as { reason?: unknown };
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

  // PUT/DELETE /api/assets/{slug}/labels/{labelSlug}（T11：挂载/移除——06 §3/§5.3）
  // 判定（design §5 R11）：label type 分判——RECOMMENDED = canManageAsset（owner/管理档
  // ADMIN/OWNER——06 §3 挂载权限）+ SUPER_ADMIN 短路；PRIVILEGED = 仅 SUPER_ADMIN。
  // 幂等：重复挂 200 / 移除不存在 204。≤10 上限（06 §1）。
  app.put('/:slug/labels/:labelSlug', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const slug = c.req.param('slug')!;
    const labelSlug = c.req.param('labelSlug')!;
    if (!labelSlugSchema.safeParse(labelSlug).success)
      throw new LabelError(labelErrorCodes.notFound);
    const row = await loadAssetBySlug(db, slug);
    const viewer = await viewerContext(c);
    const canManage = canManageAsset({
      ownerId: row.ownerId,
      viewerId: principal.userId,
      viewerRole: viewer.viewerRole,
    });
    // R14 scope：RECOMMENDED 挂载 = asset:manage（design §8 ②——service 分判内组合）
    const scopes = c.get('tokenScopes');
    const hasAssetManageScope =
      scopes === undefined || scopes === null || scopes.has(TOKEN_SCOPES.assetManage);
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

  app.delete('/:slug/labels/:labelSlug', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const slug = c.req.param('slug')!;
    const labelSlug = c.req.param('labelSlug')!;
    if (!labelSlugSchema.safeParse(labelSlug).success)
      throw new LabelError(labelErrorCodes.notFound);
    const row = await loadAssetBySlug(db, slug);
    const viewer = await viewerContext(c);
    const canManage = canManageAsset({
      ownerId: row.ownerId,
      viewerId: principal.userId,
      viewerRole: viewer.viewerRole,
    });
    // R14 scope：移除挂载同挂载权（RECOMMENDED = asset:manage——service 分判内组合）
    const scopes = c.get('tokenScopes');
    const hasAssetManageScope =
      scopes === undefined || scopes === null || scopes.has(TOKEN_SCOPES.assetManage);
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

  // GET /api/assets/{slug}/versions/{version}/download（T14：包下载——design §7.2 R13）
  // 授权序：资产读面（403/404 分层）→ 版本五档判定（PUBLISHED 公开 / UPLOADED·PENDING_REVIEW
  // 预览授权集 / YANKED → 400 version_yanked / 其余 → 400 version_not_published）→
  // 限流（60/分·IP——design G9；匿名公开下载面）→ 计数（授权过即 ++）→
  // presigned 直链 302 / Local 服务端流式 200。下载不入审计。
  app.get('/:slug/versions/:version/download', async (c) => {
    const slug = c.req.param('slug')!;
    const version = c.req.param('version')!;
    if (!slugSchema.safeParse(slug).success || !versionFieldSchema.safeParse(version).success) {
      throw new AssetError(assetErrorCodes.notFound);
    }
    const row = await loadAssetBySlug(db, slug);
    const viewer = await assertAssetReadable(c, row);
    const [versionRow] = await db
      .select({
        id: assetVersion.id,
        status: assetVersion.status,
        createdBy: assetVersion.createdBy,
        bundleStorageKey: assetVersion.bundleStorageKey,
      })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, row.id), eq(assetVersion.version, version)));
    if (!versionRow) throw new AssetError(assetErrorCodes.notFound);

    // 五档判定（design §7.2——错误码分派按 kind）
    const decision = decideDownload(versionRow.status, viewer, row.ownerId, versionRow);
    if (decision.kind === 'yanked') throw new AssetError(assetErrorCodes.versionYanked);
    if (decision.kind === 'not_published')
      throw new AssetError(assetErrorCodes.versionNotPublished);

    // 限流（下载独立实例——60/分·IP；design G9 数值）
    const clientIp = c.get('requestContext')?.clientIp ?? 'unknown';
    const rl = downloadRateLimiter.hit(`asset-download:${clientIp}`);
    if (!rl.allowed) {
      return c.json(
        {
          code: 'auth.rate_limited',
          message: 'download rate limited',
          retryAfterSec: rl.retryAfterSec,
        },
        429,
      );
    }

    const resolved = await resolveDownload(db, deps.storage, { assetId: row.id, versionRow });
    if (resolved.presignedUrl) {
      return c.redirect(resolved.presignedUrl, 302); // S3 直链路径
    }
    // Local 流式兜底：zip 字节流 + attachment（fetch Response——Node 全局类型含 BodyInit）
    const data = await deps.storage.get(resolved.bundleKey);
    const stream =
      data instanceof Buffer ? data : Readable.toWeb(data as import('node:stream').Readable);
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
