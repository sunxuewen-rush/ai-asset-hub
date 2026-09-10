/**
 * 资产域服务（M2 design §3/§7：坐标注册/读面查询）。
 * 校验职责分层：入参格式（slug/type——M4-pre S3 后可见性维度已删）由路由层 zod body schema 把关
 * （复用 protocol slugSchema / schema 枚举）；本层做坐标寻址与冲突判定。
 */
import { and, count, eq, exists, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  type AssetType,
  asset,
  assetLabel,
  assetVersion,
  labelDefinition,
  userAccount,
} from '../db/schema/index.js';
import { AssetError, assetErrorCodes } from './errors.js';

/** PG 唯一约束冲突（slug 并发兜底） */
const PG_UNIQUE_VIOLATION = '23505';

export type AssetRow = typeof asset.$inferSelect;

export interface CreateAssetInput {
  slug: string;
  type: AssetType;
  /** 主要维护人（05 §6.2：创建者 = owner） */
  ownerId: string;
}

export interface ListAssetsOptions {
  limit: number;
  offset: number;
  type?: AssetType;
  /** 全文检索（T12——design §6 R12：slug ILIKE ∪ 版本投影 name/description/searchText——01 §3.2） */
  q?: string;
  /** label 多值 OR（06 §4——命中挂载任一 label 即命中；slug 入参，服务层解 id） */
  labelSlugs?: string[];
}

/** assetItem 增强投影（M4a R5/R6：latest 版本展示 + owner 显示名——批注入防 N+1） */
export interface AssetItemMeta {
  latestVersion: string | null;
  latestName: string | null;
  latestDescription: string | null;
  ownerDisplayName: string | null;
}

/**
 * 批加载资产展示元数据（R5/R6）：latest 版本投影（parsed_metadata_json
 * name/description——01 §3.2）+ owner 显示名（user_account.displayName）。
 * 两条 inArray 查询防 N+1；缺失（无版本/owner 已删）→ null 字段。
 */
export async function loadAssetItemMeta(
  db: Db,
  assets: Array<{ id: number; ownerId: string; latestVersionId: number | null }>,
): Promise<Map<number, AssetItemMeta>> {
  const map = new Map<number, AssetItemMeta>();
  for (const a of assets) {
    map.set(a.id, {
      latestVersion: null,
      latestName: null,
      latestDescription: null,
      ownerDisplayName: null,
    });
  }
  const ownerIds = [...new Set(assets.map((a) => a.ownerId))];
  if (ownerIds.length > 0) {
    const users = await db
      .select({ id: userAccount.id, displayName: userAccount.displayName })
      .from(userAccount)
      .where(inArray(userAccount.id, ownerIds));
    const byId = new Map(users.map((u) => [u.id, u.displayName]));
    for (const a of assets) {
      const meta = map.get(a.id);
      if (!meta) continue; // 不可达守卫（map 全资产预置）
      meta.ownerDisplayName = byId.get(a.ownerId) ?? null;
    }
  }
  const versionIds = assets.map((a) => a.latestVersionId).filter((v): v is number => v !== null);
  if (versionIds.length > 0) {
    const vRows = await db
      .select({
        id: assetVersion.id,
        version: assetVersion.version,
        meta: assetVersion.parsedMetadataJson,
      })
      .from(assetVersion)
      .where(inArray(assetVersion.id, versionIds));
    const byId = new Map(vRows.map((r) => [r.id, r]));
    for (const a of assets) {
      if (a.latestVersionId === null) continue;
      const v = byId.get(a.latestVersionId);
      if (!v) continue;
      const meta = map.get(a.id);
      if (!meta) continue; // 不可达守卫（map 全资产预置）
      meta.latestVersion = v.version;
      const m = (v.meta ?? {}) as Record<string, unknown>;
      meta.latestName = typeof m.name === 'string' ? m.name : null;
      meta.latestDescription = typeof m.description === 'string' ? m.description : null;
    }
  }
  return map;
}

/**
 * 注册资产（T1 → M4-pre §2.3）：坐标为**全局唯一裸 slug**（`UNIQUE(slug)`，跨类型唯一）。
 * 冲突预检给友好 409（asset.slug_taken）；DB 唯一键 23505 兜底并发窗口。
 */
export async function createAsset(db: Db, input: CreateAssetInput): Promise<AssetRow> {
  const existing = await db
    .select({ id: asset.id })
    .from(asset)
    .where(eq(asset.slug, input.slug))
    .limit(1);
  if (existing.length > 0) throw new AssetError(assetErrorCodes.slugTaken);

  try {
    const rows = await db
      .insert(asset)
      .values({
        type: input.type,
        slug: input.slug,
        ownerId: input.ownerId,
        createdBy: input.ownerId,
        updatedBy: input.ownerId,
      })
      .returning();
    const row = rows[0];
    if (row === undefined) throw new Error('asset insert returned no row');
    return row;
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === PG_UNIQUE_VIOLATION) {
      throw new AssetError(assetErrorCodes.slugTaken);
    }
    throw err;
  }
}

/** 资产详情（按裸 slug 寻址）；读面判定（status）在调用层（http/assets.ts assertAssetReadable）；
 * M4-pre S3：原 `visibility.ts` 判定已删。 */
export async function getAsset(db: Db, slug: string): Promise<AssetRow | null> {
  const rows = await db.select().from(asset).where(eq(asset.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/** 资产列表（分页 + 简单结构过滤；M3 全文搜索不在此） */
export async function listAssets(
  db: Db,
  opts: ListAssetsOptions,
): Promise<{ items: AssetRow[]; total: number }> {
  const conditions = [];
  if (opts.type !== undefined) conditions.push(eq(asset.type, opts.type));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [totalRow] = await db.select({ total: count() }).from(asset).where(where);
  const items = await db
    .select()
    .from(asset)
    .where(where)
    // 稳定排序（createdAt desc + id desc 破平）
    .orderBy(sql`${asset.createdAt} desc, ${asset.id} desc`)
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: totalRow?.total ?? 0 };
}

/**
 * 读面列表（T3 GET /api/assets → M4-pre S3：可见性已删，读面**仅由 status 决定**）：
 * - 列表恒为「活跃资产」面：`status = ACTIVE`（HIDDEN/ARCHIVED 不进任何列表——坐标详情仍可治理访问）
 * - 与 viewer 身份**无关**（无可见性维度，故不再需要 viewer 输入；匿名/登录/超管列表一致）
 */
export async function listViewableAssets(
  db: Db,
  opts: ListAssetsOptions,
): Promise<{ items: AssetRow[]; total: number }> {
  const conditions: ReturnType<typeof eq>[] = [eq(asset.status, 'ACTIVE')];
  if (opts.type !== undefined) conditions.push(eq(asset.type, opts.type));

  // T12 全文检索（design §6 R12）：q 命中 slug 或任一版本的投影字段
  // （parsed_metadata_json → name/description/searchText——01 §3.2 投影落 jsonb）
  const q = opts.q?.trim().slice(0, 100);
  if (q && q.length > 0) {
    const pattern = `%${q}%`;
    const searchCond = or(
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
              ),
            ),
          ),
      ),
    );
    if (searchCond !== undefined) conditions.push(searchCond);
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
            .where(
              and(
                eq(assetLabel.assetId, asset.id),
                inArray(
                  assetLabel.labelId,
                  labelRows.map((l) => l.id),
                ),
              ),
            ),
        ),
      );
    }
  }

  const where = and(...conditions);
  const [totalRow] = await db.select({ total: count() }).from(asset).where(where);
  const items = await db
    .select()
    .from(asset)
    .where(where)
    // T12 排序 updated_at desc（design §6 R12——最近更新优先；id desc 破平）
    .orderBy(sql`${asset.updatedAt} desc, ${asset.id} desc`)
    .limit(opts.limit)
    .offset(opts.offset);
  return { items, total: totalRow?.total ?? 0 };
}
