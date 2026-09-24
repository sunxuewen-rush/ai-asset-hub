/**
 * 管理看板聚合 —— KPI ×8（含看板重做新加的 `downloads7d`）+ 标签维度聚合
 * （M4b-6 看板重做 · 服务端改动 1 · `GET /api/admin/overview`）。
 *
 * 口径 SSOT = 批 design §4.1(a)/(e)/(f) + §5.1 端点表 + D13/D14。
 * **KPI 空集一律返 `null`（不返 0）** —— 前端显「—」；`labels` 空集 ⇒ `[]`（数组空态）。
 *
 * 看板重做（T6⁺）换靶记录：
 * - **删 `creative`（四项）** —— 领导拍板砍掉，无消费者。
 * - **删 `types[]`** —— 两张图改标签维度后无消费者（类型维度退场）。
 * - **加 `labels[]`** —— 支撑「标签资产数量」（同心环）与「标签下载热度」（雷达）两图，**加性**、零迁移。
 *
 * `labels[]` 口径（拍板逐条落地）：
 * 1. **只列一级标签**（`label_definition.parent_id IS NULL`）—— 二级子标签不单独出现；
 * 2. **上卷**：子标签上的挂载算到它的一级父标签；
 * 3. **仅 `ACTIVE` 资产**（与「已发布资产」卡同面）；
 * 4. **去重**：一资产同时挂父、子两个标签 ⇒ 只计一次（`selectDistinct` 先打散 (根标签, 资产) 对）；
 * 5. `count` = 去重后的 ACTIVE 资产数 · `downloads` = **同一集合**的 `sum(download_count)`；
 * 6. **一资产可挂多标签 ⇒ 各标签 `count` 之和 ≠ 已发布资产数**（口径提示由前端呈现，本层不出该文案）；
 * 7. 排序 = `count desc, id asc`（稳定序；「下载热度」图由前端按 `downloads` 自行排）。
 *
 * 标签名（**零复制**）= `labels` 域 `pickDisplayName` 回退链（`zh-CN` → `zh` → `en` → slug），
 * 与标签定义页 / 资产挂载面**同一条**回退链（`labels/service.ts` 单点）。
 *
 * 状态面差异（**须知**）：`labels[].count` 只算 `ACTIVE`，而删标签守卫（`deleteLabel`）按「任一状态挂载即拒删」——
 * 显示口径与守卫口径**刻意不同**：守卫若只认 `ACTIVE`，删除会 CASCADE 掉隐藏/归档资产上的挂载行（静默丢数据）。
 *
 * 性能：**10 条查询** —— 6 条聚合并发（①–⑥）+ 下载事件 2 条顺序（先探 `download_event` 存在性、再计数）
 * + 标签名批次 2 条（`displayNamesOf`：定义 + 翻译）；真库 53 资产 / 3 标签 ⇒ 实时查询足够（**不加缓存**，D54）。
 */
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { asset, assetLabel, labelDefinition, reviewTask, user } from '../db/schema/index.js';
import { displayNamesOf } from '../labels/service.js';
import {
  type LabelRollupParent,
  labelRollupOn,
  labelRollupParent,
  rootLabelId,
} from './label-rollup.js';
import { countDownloadEventsInLastDays } from './trends.js';

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
  /**
   * **近 7 个自然日**（含今天 · 上海日界，与趋势曲线同口径）新增下载事件数 —— 看板「累计下载」卡副行数据源。
   * `download_event` 表不可用 ⇒ `null`（D52 两态；前端显「暂无下载历史」）。
   * **与趋势窗口选择器无关**（修 F208：前端原先按所选窗口切片算，切「近 7 天」时会退化成总量）。
   */
  downloads7d: number | null;
}

/** 一级标签维度聚合（(e) 同心环 + (f) 雷达的数据源 · 看板重做加性字段） */
export interface AdminOverviewLabel {
  /** `label_definition.id`（一级标签） */
  id: number;
  /** 一级标签 slug */
  slug: string;
  /** 显示名（回退链 zh-CN → zh → en → slug，永不空） */
  name: string;
  /** 该一级标签（含其子标签上卷）下**去重**的 `ACTIVE` 资产数 */
  count: number;
  /** 同一资产集合的 `sum(download_count)` */
  downloads: number;
}

export interface AdminOverview {
  kpi: AdminOverviewKpi;
  labels: AdminOverviewLabel[];
}

/** 标签名 locale（看板为中文优先 UI；回退链保证永不空显示 —— 与 `rankings.ts` 同口径） */
const LABELS_LOCALE = 'zh-CN';

/** 按状态取值（缺失即 0——分组查询天然只回有数据的状态） */
function nOf(rows: Array<{ status: string | null; n: number }>, status: string): number {
  return rows.find((r) => r.status === status)?.n ?? 0;
}

/** 分组计数求和（全部行） */
function totalOf(rows: Array<{ n: number }>): number {
  return rows.reduce((acc, r) => acc + r.n, 0);
}

export async function getAdminOverview(db: Db): Promise<AdminOverview> {
  /** 一级标签自连接别名（上卷落点）—— 口径单点见 `./label-rollup.ts` */
  const parentLabel: LabelRollupParent = labelRollupParent();

  const [assetRows, downloadRow, reviewRows, userRows, rootRows, pairRows] = await Promise.all([
    // ① 资产按状态分组（一次查询同时供 activeAssets / allAssets）
    db.select({ status: asset.status, n: count() }).from(asset).groupBy(asset.status),
    // ② 累计下载（pg bigint sum 返回 string ⇒ 显式 Number，同 assets/stats.ts 注释）
    db.select({ d: sql<string>`coalesce(sum(${asset.downloadCount}), 0)` }).from(asset),
    // ③ 审核任务按状态分组（pending + reviewsTotal）
    db
      .select({ status: reviewTask.status, n: count() })
      .from(reviewTask)
      .groupBy(reviewTask.status),
    // ④ 账号按状态分组（activeUsers + allUsers）
    db.select({ status: user.status, n: count() }).from(user).groupBy(user.status),
    // ⑤ 一级标签全集（含零挂载者 ⇒ count 0；保证口径行「仅 N 个一级标签」与定义数一致）
    db
      .select({ id: labelDefinition.id, slug: labelDefinition.slug })
      .from(labelDefinition)
      .where(isNull(labelDefinition.parentId))
      .orderBy(asc(labelDefinition.id)),
    // ⑥ (根标签, 资产) 去重对 + 该资产下载数（上卷 + 仅 ACTIVE + 去重）
    db
      .selectDistinct({
        rootId: rootLabelId(parentLabel),
        assetId: asset.id,
        downloads: asset.downloadCount,
      })
      .from(assetLabel)
      .innerJoin(labelDefinition, eq(assetLabel.labelId, labelDefinition.id))
      .leftJoin(parentLabel, labelRollupOn(parentLabel))
      .innerJoin(asset, and(eq(assetLabel.assetId, asset.id), eq(asset.status, 'ACTIVE'))),
  ]);

  // 下载事件两态 + 近 7 自然日计数（KPI 副行 · 顺序执行：计数前必须先判表存在，同 trends 做法）
  const downloads7d = await countDownloadEventsInLastDays(db, 7);

  // 根标签聚合（JS 侧归并：一行一 (根标签, 资产) 对，天然去重）
  const agg = new Map<number, { count: number; downloads: number }>();
  for (const r of pairRows) {
    const rootId = Number(r.rootId);
    const cur = agg.get(rootId) ?? { count: 0, downloads: 0 };
    cur.count += 1;
    cur.downloads += Number(r.downloads ?? 0);
    agg.set(rootId, cur);
  }

  const names = await displayNamesOf(
    db,
    rootRows.map((r) => r.id),
    LABELS_LOCALE,
  );

  return {
    kpi: {
      activeAssets: nOf(assetRows, 'ACTIVE'),
      allAssets: totalOf(assetRows),
      downloads: Number(downloadRow[0]?.d ?? 0),
      pending: nOf(reviewRows, 'PENDING'),
      reviewsTotal: totalOf(reviewRows),
      activeUsers: nOf(userRows, 'ACTIVE'),
      allUsers: totalOf(userRows),
      downloads7d,
    },
    // 稳定序：count desc, id asc（「下载热度」图由前端按 downloads 自排）
    labels: rootRows
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: names.get(r.id) ?? r.slug,
        count: agg.get(r.id)?.count ?? 0,
        downloads: agg.get(r.id)?.downloads ?? 0,
      }))
      .sort((a, b) => b.count - a.count || a.id - b.id),
  };
}
