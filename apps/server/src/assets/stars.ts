/**
 * 收藏（star）服务（M4b-4 批 design **v1.8 §5.1 ⑧**）：
 * 收藏关系 + 热度计数 + 读面 —— 契约全文见批 design §5.1 ⑧。
 *
 * 设计要点（照契约实现，勿在此层加判定）：
 * - **权限**：授权由**路由层**负责（`requireAuth` + `assertAssetReadable`；社交动作**不受**
 *   `canManageAsset` 约束）—— 本层只做「关系 + 计数」的**幂等**维护。
 * - **幂等**：`UNIQUE(asset_id, user_id)` 是结构保证；`ON CONFLICT DO NOTHING` 命中 ⇒ **不改计数**。
 * - **计数**：`asset.star_count` 冗余列，**同事务内** ±1（沿 `08` 范式「热查询计数冗余在主表、事务内自增」；
 *   与 `download_count` 同族）。
 * - **不写审计**（与「下载不入审计」同口径 · R13 先例）；**不限流**（`PUT`/`DELETE` 幂等）。
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { asset, assetStar } from '../db/schema/index.js';

export interface StarResult {
  starCount: number;
  starred: boolean;
}

/** 读当前计数（幂等分支与读面共用；行不存在 ⇒ 0） */
async function currentStarCount(tx: Pick<Db, 'select'>, assetId: number): Promise<number> {
  const [row] = await tx
    .select({ starCount: asset.starCount })
    .from(asset)
    .where(eq(asset.id, assetId));
  return row?.starCount ?? 0;
}

/**
 * 收藏（幂等）：已收藏 ⇒ 计数不变，仍返回 `starred: true`。
 * 计数下界由 `greatest(..., 0)` 兜底（理论不可达——防脏数据把计数压成负数）。
 */
export async function starAsset(db: Db, assetId: number, userId: string): Promise<StarResult> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(assetStar)
      .values({ assetId, userId })
      .onConflictDoNothing({ target: [assetStar.assetId, assetStar.userId] })
      .returning({ id: assetStar.id });
    if (inserted.length === 0) {
      // 已收藏 ⇒ 幂等：不动计数
      return { starCount: await currentStarCount(tx, assetId), starred: true };
    }
    const [updated] = await tx
      .update(asset)
      .set({ starCount: sql`${asset.starCount} + 1` })
      .where(eq(asset.id, assetId))
      .returning({ starCount: asset.starCount });
    return { starCount: updated?.starCount ?? 0, starred: true };
  });
}

/** 取消收藏（幂等）：未收藏 ⇒ 计数不变，仍返回 `starred: false`。 */
export async function unstarAsset(db: Db, assetId: number, userId: string): Promise<StarResult> {
  return db.transaction(async (tx) => {
    const deleted = await tx
      .delete(assetStar)
      .where(and(eq(assetStar.assetId, assetId), eq(assetStar.userId, userId)))
      .returning({ id: assetStar.id });
    if (deleted.length === 0) {
      return { starCount: await currentStarCount(tx, assetId), starred: false };
    }
    const [updated] = await tx
      .update(asset)
      .set({ starCount: sql`greatest(${asset.starCount} - 1, 0)` })
      .where(eq(asset.id, assetId))
      .returning({ starCount: asset.starCount });
    return { starCount: updated?.starCount ?? 0, starred: false };
  });
}

/**
 * 读面：批量取「我收藏过的资产 id」（列表页**一次** `inArray`，防 N+1）。
 * 匿名（`userId === null`）⇒ 空集（**不发查询**）。
 */
export async function starredAssetIds(
  db: Db,
  userId: string | null,
  assetIds: readonly number[],
): Promise<Set<number>> {
  if (!userId || assetIds.length === 0) return new Set();
  const rows = await db
    .select({ assetId: assetStar.assetId })
    .from(assetStar)
    .where(and(eq(assetStar.userId, userId), inArray(assetStar.assetId, [...assetIds])));
  return new Set(rows.map((r) => r.assetId));
}

/** 读面：单资产「我是否已收藏」（详情/写后回读用）；匿名 ⇒ `false`（**不发查询**）。 */
export async function hasStarred(db: Db, userId: string | null, assetId: number): Promise<boolean> {
  if (!userId) return false;
  const rows = await db
    .select({ id: assetStar.id })
    .from(assetStar)
    .where(and(eq(assetStar.userId, userId), eq(assetStar.assetId, assetId)))
    .limit(1);
  return rows.length > 0;
}
