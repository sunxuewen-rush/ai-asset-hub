/**
 * 资产域服务（M2 design §3/§7：坐标注册/读面查询）。
 * 校验职责分层：入参格式（slug/type/visibility）由路由层 zod body schema 把关
 * （复用 protocol slugSchema / schema 枚举）；本层做坐标寻址与冲突判定。
 */
import { and, count, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  asset,
  namespace,
  type AssetType,
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
}

/** namespace 按 slug 寻址（坐标第一跳；不存在 → 404） */
async function findNamespaceBySlug(db: Db, slug: string) {
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
