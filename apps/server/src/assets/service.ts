/**
 * 资产域服务（M2 design §3/§7：坐标注册/读面查询）。
 * 校验职责分层：入参格式（slug/type/visibility）由路由层 zod body schema 把关
 * （复用 protocol slugSchema / schema 枚举）；本层做坐标寻址与冲突判定。
 */
import { and, count, eq, exists, ilike, inArray, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  asset,
  assetLabel,
  assetVersion,
  labelDefinition,
  namespace,
  namespaceMember,
  type AssetType,
  type NamespaceRole,
  type Visibility,
} from '../db/schema/index.js';
import { AssetError, assetErrorCodes } from './errors.js';

/** PG 唯一约束冲突（slug 并发兜底） */
const PG_UNIQUE_VIOLATION = '23505';

export type AssetRow = typeof asset.$inferSelect;

export interface CreateAssetInput {
  namespaceSlug: string;
  slug: string;
  type: AssetType;
  /** 主要维护人（05 §6.2：创建者 = owner） */
  ownerId: string;
  /** 默认 PUBLIC（08 §5.1） */
  visibility?: Visibility;
}

export interface ListAssetsOptions {
  limit: number;
  offset: number;
  namespaceSlug?: string;
  type?: AssetType;
  visibility?: Visibility;
  /** 全文检索（T12——design §6 R12：slug ILIKE ∪ 版本投影 name/description/searchText——01 §3.2） */
  q?: string;
  /** label 多值 OR（06 §4——命中挂载任一 label 即命中；slug 入参，服务层解 id） */
  labelSlugs?: string[];
}

/** 读面浏览上下文（T3 列表端点：requireAuth 后必有 userId；超管短路全可见） */
export interface AssetViewerContext {
  userId: string;
  isSuperAdmin: boolean;
}

/** namespace 按 slug 寻址（坐标第一跳；不存在 → 404） */
export async function findNamespaceBySlug(db: Db, slug: string) {
  const rows = await db
    .select({ id: namespace.id, status: namespace.status })
    .from(namespace)
    .where(eq(namespace.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 注册资产（T1）：坐标 @namespaceSlug/slug 跨类型唯一（01 §3.3）。
 * 冲突预检给友好 409（asset.slug_taken）；DB 唯一键 23505 兜底并发窗口。
 */
export async function createAsset(
  db: Db,
  input: CreateAssetInput,
): Promise<AssetRow> {
  const ns = await findNamespaceBySlug(db, input.namespaceSlug);
  if (!ns) throw new AssetError(assetErrorCodes.namespaceNotFound);

  const existing = await db
    .select({ id: asset.id })
    .from(asset)
    .where(and(eq(asset.namespaceId, ns.id), eq(asset.slug, input.slug)))
    .limit(1);
  if (existing.length > 0) throw new AssetError(assetErrorCodes.slugTaken);

  try {
    const rows = await db
      .insert(asset)
      .values({
        namespaceId: ns.id,
        type: input.type,
        slug: input.slug,
        ownerId: input.ownerId,
        visibility: input.visibility ?? 'PUBLIC',
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
      })
      .returning();
    return rows[0]!;
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === PG_UNIQUE_VIOLATION) {
      throw new AssetError(assetErrorCodes.slugTaken);
    }
    throw err;
  }
}

/** 资产详情（按坐标寻址）；可见性判定在调用层（visibility.ts，T2） */
export async function getAsset(
  db: Db,
  namespaceSlug: string,
  slug: string,
): Promise<AssetRow | null> {
  const rows = await db
    .select({ asset: asset })
    .from(asset)
    .innerJoin(namespace, eq(asset.namespaceId, namespace.id))
    .where(and(eq(namespace.slug, namespaceSlug), eq(asset.slug, slug)))
    .limit(1);
  return rows[0]?.asset ?? null;
}

/** 资产列表（分页 + 简单结构过滤；M3 全文搜索不在此） */
export async function listAssets(
  db: Db,
  opts: ListAssetsOptions,
): Promise<{ items: AssetRow[]; total: number }> {
  const conditions = [];
  if (opts.namespaceSlug !== undefined) {
    const ns = await findNamespaceBySlug(db, opts.namespaceSlug);
    // namespace 不存在 → 空结果（非 404：列表语义）
    if (!ns) return { items: [], total: 0 };
    conditions.push(eq(asset.namespaceId, ns.id));
  }
  if (opts.type !== undefined) conditions.push(eq(asset.type, opts.type));
  if (opts.visibility !== undefined) conditions.push(eq(asset.visibility, opts.visibility));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [totalRow] = await db
    .select({ total: count() })
    .from(asset)
    .where(where);
  const items = await db
    .select()
    .from(asset)
    .where(where)
    // 稳定排序（同 namespaces：createdAt desc + id desc 破平）
    .orderBy(sql`${asset.createdAt} desc, ${asset.id} desc`)
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: totalRow?.total ?? 0 };
}

/** 我的空间成员关系子查询（T3 读面过滤共用；roles 限定如 ['OWNER','ADMIN']） */
function myNamespaceIdsSubquery(db: Db, userId: string, roles?: NamespaceRole[]) {
  if (roles) {
    return db
      .select({ id: namespaceMember.namespaceId })
      .from(namespaceMember)
      .where(and(eq(namespaceMember.userId, userId), inArray(namespaceMember.role, roles)));
  }
  return db
    .select({ id: namespaceMember.namespaceId })
    .from(namespaceMember)
    .where(eq(namespaceMember.userId, userId));
}

/**
 * 读面可见列表（T3 GET /api/assets；08 §5.1 可见性 SQL 过滤）：
 * - ACTIVE 空间中的 ACTIVE 资产（HIDDEN/ARCHIVED 不进任何列表——坐标详情仍可治理访问）
 * - PUBLIC：全站可见
 * - NAMESPACE_ONLY：我成员的空间
 * - PRIVATE：我是 owner，或我在空间的角色为 OWNER/ADMIN（05 §6.5 管理面）
 * - SUPER_ADMIN：全量可见（含 PRIVATE——不自动含 HIDDEN，列表统一 ACTIVE）
 */
export async function listViewableAssets(
  db: Db,
  opts: ListAssetsOptions & { viewer: AssetViewerContext },
): Promise<{ items: Array<AssetRow & { namespaceSlug: string }>; total: number }> {
  const conditions: ReturnType<typeof eq>[] = [
    eq(namespace.status, 'ACTIVE'),
    eq(asset.status, 'ACTIVE'),
  ];
  if (opts.namespaceSlug !== undefined) {
    const ns = await findNamespaceBySlug(db, opts.namespaceSlug);
    if (!ns) return { items: [], total: 0 };
    conditions.push(eq(asset.namespaceId, ns.id));
  }
  if (opts.type !== undefined) conditions.push(eq(asset.type, opts.type));
  if (opts.visibility !== undefined) conditions.push(eq(asset.visibility, opts.visibility));

  // T12 全文检索（design §6 R12）：q 命中 slug 或任一版本的投影字段
  // （parsed_metadata_json → name/description/searchText——01 §3.2 投影落 jsonb）
  const q = opts.q?.trim().slice(0, 100);
  if (q && q.length > 0) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(asset.slug, pattern),
        exists(
          db
            .select({ id: assetVersion.id })
            .from(assetVersion)
            .where(
              and(
                eq(assetVersion.assetId, asset.id),
                or(
                  ilike(sql`${assetVersion.parsedMetadataJson}->>'name'`, pattern),
                  ilike(sql`${assetVersion.parsedMetadataJson}->>'description'`, pattern),
                  ilike(sql`${assetVersion.parsedMetadataJson}->>'searchText'`, pattern),
                )!,
              ),
            ),
        ),
      )!,
    );
  }

  // T12 label 多值 OR（06 §4——挂载任一即命中；slug → id 解析；全不存在 → 视为无筛选不报错）
  if (opts.labelSlugs && opts.labelSlugs.length > 0) {
    const labelRows = await db
      .select({ id: labelDefinition.id })
      .from(labelDefinition)
      .where(inArray(labelDefinition.slug, opts.labelSlugs));
    if (labelRows.length > 0) {
      conditions.push(
        exists(
          db
            .select({ id: assetLabel.id })
            .from(assetLabel)
            .where(and(eq(assetLabel.assetId, asset.id), inArray(assetLabel.labelId, labelRows.map((l) => l.id)))),
        ),
      );
    }
  }

  if (!opts.viewer.isSuperAdmin) {
    const viewerId = opts.viewer.userId;
    const memberNs = myNamespaceIdsSubquery(db, viewerId);
    const adminNs = myNamespaceIdsSubquery(db, viewerId, ['OWNER', 'ADMIN']);
    conditions.push(
      or(
        eq(asset.visibility, 'PUBLIC'),
        and(eq(asset.visibility, 'NAMESPACE_ONLY'), inArray(asset.namespaceId, memberNs)),
        and(
          eq(asset.visibility, 'PRIVATE'),
          or(eq(asset.ownerId, viewerId), inArray(asset.namespaceId, adminNs)),
        ),
      )!,
    );
  }

  const where = and(...conditions);
  const [totalRow] = await db
    .select({ total: count() })
    .from(asset)
    .innerJoin(namespace, eq(asset.namespaceId, namespace.id))
    .where(where);
  const items = await db
    .select({ a: asset, nsSlug: namespace.slug })
    .from(asset)
    .innerJoin(namespace, eq(asset.namespaceId, namespace.id))
    .where(where)
    // T12 排序 updated_at desc（design §6 R12——最近更新优先；id desc 破平）
    .orderBy(sql`${asset.updatedAt} desc, ${asset.id} desc`)
    .limit(opts.limit)
    .offset(opts.offset);
  return {
    items: items.map((r) => ({ ...r.a, namespaceSlug: r.nsSlug })),
    total: totalRow?.total ?? 0,
  };
}
