/**
 * /api/assets 路由组（M2 T3，design §3/§7/§9）：
 * POST 注册（asset:publish 空间成员判定）· GET 列表（读面可见 SQL 过滤）·
 * GET 详情（visibility 判定；PUBLIC 匿名可读）。
 * 统一 404 语义：坐标不存在与不可见同码（防枚举）。
 */
import { slugSchema } from '@ai-asset-hub/protocol';
import { Hono } from 'hono';
import { z } from 'zod';
import { AssetError, assetErrorCodes } from '../assets/errors.js';
import {
  createAsset,
  findNamespaceBySlug,
  getAsset,
  listViewableAssets,
  type AssetRow,
} from '../assets/service.js';
import {
  canViewAsset,
} from '../assets/visibility.js';
import { AuthError } from '../auth/errors.js';
import { PERMISSIONS } from '../auth/permissions.js';
import type { Db } from '../db/client.js';
import { assetTypeSchema, type NamespaceRole, visibilitySchema } from '../db/schema/index.js';
import { requireAuth } from './auth-middleware.js';

export interface AssetRoutesDeps {
  db: Db;
}

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
    if (!slugSchema.safeParse(nsSlug).success || !slugSchema.safeParse(slug).success) {
      throw new AssetError(assetErrorCodes.notFound);
    }

    const ns = await findNamespaceBySlug(db, nsSlug);
    if (!ns) throw new AssetError(assetErrorCodes.notFound);
    const row = await getAsset(db, nsSlug, slug);
    if (!row) throw new AssetError(assetErrorCodes.notFound);

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

  return app;
}
