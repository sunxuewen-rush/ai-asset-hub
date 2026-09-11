/**
 * 公开统计聚合（M4a R7——design §5.2 G6 定案；v0.17 增 `totalUsers`）。
 *
 * 聚合语义与匿名列表同面（M4-pre S3：**可见性已删**，仅 `status = ACTIVE` + 无空间维度）——防泄露：
 * HIDDEN/ARCHIVED 一律不计入。
 *
 * v0.17 `totalUsers` 口径 = **`user_account.status = 'ACTIVE'`**（排除 PENDING / DISABLED）——
 * 由实现侧选定（1 行谓词可切换为全量 `count(*)`）。⚠ 注意与资产侧「防泄露」**不同层**：用户规模是
 * 注册量而非「公开内容派生量」，属**主动披露项**（2026-09-11 用户拍板在首页展示「用户数量」）。
 */
import { count, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { asset, userAccount } from '../db/schema/index.js';

export interface PublicStats {
  totalAssets: number;
  totalDownloads: number;
  /** 协议类型枚举驱动（Record——新增类型自动跟随，契约不腐化） */
  typeCounts: Record<string, number>;
  /** 注册用户数（口径：`status = 'ACTIVE'`） */
  totalUsers: number;
}

export async function getPublicStats(db: Db): Promise<PublicStats> {
  const [assetRows, userRows] = await Promise.all([
    db
      .select({
        type: asset.type,
        count: count(),
        downloads: sql<number>`coalesce(sum(${asset.downloadCount}), 0)`,
      })
      .from(asset)
      .where(eq(asset.status, 'ACTIVE'))
      .groupBy(asset.type),
    db.select({ count: count() }).from(userAccount).where(eq(userAccount.status, 'ACTIVE')),
  ]);

  const typeCounts: Record<string, number> = {};
  let totalAssets = 0;
  let totalDownloads = 0;
  for (const r of assetRows) {
    typeCounts[r.type] = r.count;
    totalAssets += r.count;
    // pg sum(numeric) 返回 string——显式 Number（JSON 契约 totalDownloads: number）
    totalDownloads += Number(r.downloads ?? 0);
  }
  return {
    totalAssets,
    totalDownloads,
    typeCounts,
    totalUsers: userRows[0]?.count ?? 0,
  };
}
