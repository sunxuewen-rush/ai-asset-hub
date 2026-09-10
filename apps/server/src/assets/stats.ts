/**
 * 公开统计聚合（M4a R7——design §5.2 G6 定案）。
 * 聚合语义与匿名列表同面（仅 PUBLIC 可见性 + ACTIVE 状态；M4-pre：无空间维度）——防泄露：
 * PRIVATE/NAMESPACE_ONLY/非 ACTIVE 一律不计入。
 */
import { and, count, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { asset } from '../db/schema/index.js';

export interface PublicStats {
  totalAssets: number;
  totalDownloads: number;
  /** 协议类型枚举驱动（Record——新增类型自动跟随，契约不腐化） */
  typeCounts: Record<string, number>;
}

export async function getPublicStats(db: Db): Promise<PublicStats> {
  const rows = await db
    .select({
      type: asset.type,
      count: count(),
      downloads: sql<number>`coalesce(sum(${asset.downloadCount}), 0)`,
    })
    .from(asset)
    .where(and(eq(asset.status, 'ACTIVE'), eq(asset.visibility, 'PUBLIC')))
    .groupBy(asset.type);

  const typeCounts: Record<string, number> = {};
  let totalAssets = 0;
  let totalDownloads = 0;
  for (const r of rows) {
    typeCounts[r.type] = r.count;
    totalAssets += r.count;
    // pg sum(numeric) 返回 string——显式 Number（JSON 契约 totalDownloads: number）
    totalDownloads += Number(r.downloads ?? 0);
  }
  return { totalAssets, totalDownloads, typeCounts };
}
