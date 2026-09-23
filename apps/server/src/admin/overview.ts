/**
 * 管理看板聚合 —— KPI ×7 + 创意四项（M4b-6 T1 · 服务端改动 1 · `GET /api/admin/overview`）。
 *
 * 口径 SSOT = 批 design §4.1(a)/(g) + §5.1 端点表 + D31/D33/D34/D43/D44/D45。
 * **空集一律返 `null`（不返 0）** —— 前端显「—」（design §4.1(g) 边界列 · D43）。
 *
 * 实现期口径落点（design 未点名列 / 单位，本文件是唯一落点）：
 * 1. **沉睡资产「上架 ≥30 天」** = 该资产**存在** `PUBLISHED` 版本且其 `published_at ≤ now() − 30 天`
 *    —— 与「**首次**上架 ≥30 天」等价（存在一个 ≥30 天前的发布版 ⟺ 首次发布不晚于该阈值）；
 *    `asset` 表**无**上架时间列（时间在 `asset_version.published_at`，见 `db/schema/assets.ts:107`），
 *    故走 `exists` 子查询。
 * 2. **`reviewSpeed` 单位 = 小时**（float）· **`concentration` / `labelCoverage` = 比例 0–1**（float）——
 *    design 只定算法未定量纲；格式化（天 / %）归前端。
 * 3. 集中度 Top10 排序键 = `download_count desc, id desc`（与 D53 稳定排序同键）。
 * 4. **`types[]`（F203 补）**：design §4.1**(e) 类型数量（同心环 D13）** 与 **(f) 类型下载热度（雷达 Dots D14）**
 *    指向「口径与出参见 §5.1」，但 §5.1 的 overview 出参未列类型级字段 ⇒ 实现期以**最小加性字段**补齐：
 *    `types = [{ type, count, downloads }]`（**仅 `ACTIVE`**，与「已发布资产」同面；`downloads` = 该类型 `sum(download_count)`）。
 *    两图共用一份聚合（一次 groupBy），前端按类型色映射（skill/mcp/agent）。
 *
 * 性能：8 条独立聚合并发（真库 44 资产 / 2,474 审计行级 ⇒ 实时查询足够；**不加缓存**，D54）。
 */
import { and, count, desc, eq, exists, isNotNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { asset, assetLabel, assetVersion, reviewTask, user } from '../db/schema/index.js';

/** 沉睡阈值（天）—— 端点常量（D45：不进库、不做配置） */
const SLEEPING_DAYS = 30;
/** 下载集中度取 Top10（design §4.1(g)） */
const CONCENTRATION_TOP = 10;

export interface AdminOverviewKpi {
  /** `asset.status = 'ACTIVE'` 计数（「已发布资产」卡） */
  activeAssets: number;
  /** 全部资产（含 `HIDDEN` / `ARCHIVED`）—— 副行 hint */
  allAssets: number;
  /** `sum(asset.download_count)`（**全部状态**：计数随资产状态变化不重置） */
  downloads: number;
  /** `review_task.status = 'PENDING'` 任务数（D33 —— **不是** `asset.status`） */
  pending: number;
  /** `review_task` 全部行 —— 副行 hint「累计审核」 */
  reviewsTotal: number;
  /** `user.status = 'ACTIVE'` 账号数（D34 —— 与 `/api/stats.totalUsers` 同口径） */
  activeUsers: number;
  /** `user` 全部行（含 `PENDING` / `DISABLED`）—— 副行 hint「全部账号」 */
  allUsers: number;
}

export interface AdminOverviewCreative {
  /** 平均审核时长（**小时**）= `avg(reviewed_at − submitted_at)` over `APPROVED`（D43）· 空集 ⇒ `null` */
  reviewSpeed: number | null;
  /** 下载集中度（**比例 0–1**）= Top10 下载 ÷ 总下载 · 总下载 0 ⇒ `null` */
  concentration: number | null;
  /** 标签覆盖度（**比例 0–1**）= 至少挂 1 标签的 `ACTIVE` ÷ `ACTIVE`（D44）· 无 `ACTIVE` ⇒ `null` */
  labelCoverage: number | null;
  /** 沉睡资产数 = `ACTIVE` ∧ 首次上架 ≥30 天 ∧ `download_count = 0`（D45） */
  sleeping: number;
}

/** 类型级聚合（(e) 同心环 + (f) 雷达的数据源 · F203 补） */
export interface AdminOverviewType {
  type: string;
  /** 该类型的 `ACTIVE` 资产数 */
  count: number;
  /** 该类型的累计下载次数（`sum(download_count)`） */
  downloads: number;
}

export interface AdminOverview {
  kpi: AdminOverviewKpi;
  creative: AdminOverviewCreative;
  types: AdminOverviewType[];
}

/** 按状态取值（缺失即 0——分组查询天然只回有数据的状态） */
function nOf(rows: Array<{ status: string | null; n: number }>, status: string): number {
  return rows.find((r) => r.status === status)?.n ?? 0;
}

/** 分组计数求和（全部行） */
function totalOf(rows: Array<{ n: number }>): number {
  return rows.reduce((acc, r) => acc + r.n, 0);
}

export async function getAdminOverview(db: Db): Promise<AdminOverview> {
  const [
    assetRows,
    downloadRow,
    topRows,
    reviewRows,
    userRows,
    speedRow,
    coveredRow,
    sleepingRow,
    typeRows,
  ] = await Promise.all([
    // ① 资产按状态分组（一次查询同时供 activeAssets / allAssets）
    db.select({ status: asset.status, n: count() }).from(asset).groupBy(asset.status),
    // ② 累计下载（pg bigint sum 返回 string ⇒ 显式 Number，同 assets/stats.ts 注释）
    db.select({ d: sql<string>`coalesce(sum(${asset.downloadCount}), 0)` }).from(asset),
    // ③ 集中度分子 = Top10 下载数（稳定键同 D53）
    db
      .select({ d: asset.downloadCount })
      .from(asset)
      .orderBy(desc(asset.downloadCount), desc(asset.id))
      .limit(CONCENTRATION_TOP),
    // ④ 审核任务按状态分组（pending + reviewsTotal）
    db
      .select({ status: reviewTask.status, n: count() })
      .from(reviewTask)
      .groupBy(reviewTask.status),
    // ⑤ 账号按状态分组（activeUsers + allUsers）
    db.select({ status: user.status, n: count() }).from(user).groupBy(user.status),
    // ⑥ 平均审核时长 —— 样本 = APPROVED 且 reviewed_at 非空（D43；容错：历史行可能缺 reviewed_at）
    db
      .select({
        hours: sql<
          string | null
        >`avg(extract(epoch from (${reviewTask.reviewedAt} - ${reviewTask.submittedAt}))) / 3600.0`,
      })
      .from(reviewTask)
      .where(and(eq(reviewTask.status, 'APPROVED'), isNotNull(reviewTask.reviewedAt))),
    // ⑦ 标签覆盖度分子：至少挂 1 个标签的 ACTIVE 资产（exists 子查询 —— 同 assets/service.ts 惯用法）
    db
      .select({ n: count() })
      .from(asset)
      .where(
        and(
          eq(asset.status, 'ACTIVE'),
          exists(
            db
              .select({ id: assetLabel.id })
              .from(assetLabel)
              .where(eq(assetLabel.assetId, asset.id)),
          ),
        ),
      ),
    // ⑧ 沉睡资产（口径见文件头注 1）
    db
      .select({ n: count() })
      .from(asset)
      .where(
        and(
          eq(asset.status, 'ACTIVE'),
          eq(asset.downloadCount, 0),
          exists(
            db
              .select({ id: assetVersion.id })
              .from(assetVersion)
              .where(
                and(
                  eq(assetVersion.assetId, asset.id),
                  eq(assetVersion.status, 'PUBLISHED'),
                  // 参数化区间：SLEEPING_DAYS * interval '1 day'（避免拼 SQL 字符串）
                  sql`${assetVersion.publishedAt} <= now() - ${SLEEPING_DAYS} * interval '1 day'`,
                ),
              ),
          ),
        ),
      ),
    // ⑨ 类型级聚合（F203：(e) 同心环 + (f) 雷达共用；仅 ACTIVE）
    db
      .select({
        type: asset.type,
        n: count(),
        downloads: sql<string>`coalesce(sum(${asset.downloadCount}), 0)`,
      })
      .from(asset)
      .where(eq(asset.status, 'ACTIVE'))
      .groupBy(asset.type),
  ]);

  const activeAssets = nOf(assetRows, 'ACTIVE');
  const downloads = Number(downloadRow[0]?.d ?? 0);
  const topDownloads = topRows.reduce((acc, r) => acc + Number(r.d), 0);
  const speed = speedRow[0]?.hours ?? null;
  const covered = coveredRow[0]?.n ?? 0;

  return {
    kpi: {
      activeAssets,
      allAssets: totalOf(assetRows),
      downloads,
      pending: nOf(reviewRows, 'PENDING'),
      reviewsTotal: totalOf(reviewRows),
      activeUsers: nOf(userRows, 'ACTIVE'),
      allUsers: totalOf(userRows),
    },
    creative: {
      reviewSpeed: speed === null ? null : Number(speed),
      concentration: downloads > 0 ? topDownloads / downloads : null,
      labelCoverage: activeAssets > 0 ? covered / activeAssets : null,
      sleeping: sleepingRow[0]?.n ?? 0,
    },
    // 类型按计数降序（图例/同心环「内→外 = 小→大」由前端排序，服务端给稳定序即可）
    types: typeRows
      .map((r) => ({ type: r.type, count: Number(r.n), downloads: Number(r.downloads ?? 0) }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
  };
}
