/**
 * 管理看板排行榜 —— 三口径（人 / 标签 / 资产 · M4b-6 T1 · 服务端改动 2 · `GET /api/admin/rankings`）。
 *
 * 口径 = 批 design §4.1(c) + §5.1 + D9/D42/D46/D53：
 * - **人** = 该账号 owner 的 `ACTIVE` 资产数（D46；**排除** `reviewed_by` 维度）；`id` = 工号，`name` = 姓名
 *   （D9「人」轴 = 工号 + 姓名 ⇒ 两者分列返回，拼接归前端）
 * - **标签** = 该标签的**挂载数**（D42：**重复计入** —— 一资产挂 N 标签则每个标签各计一次）。
 *   口径与标签定义页 `/api/labels/all` 的 `assetCount`（M4b-6 T4）**逐字一致**：`asset_label` 行数、
 *   **不分资产状态** —— 防「同一数字两页不同」（治理页说 3、看板说 2）
 * - **资产** = `asset.download_count`（**仅 `ACTIVE`** —— 看板是「已发布面」，与「已发布资产」卡 / 标签覆盖度 /
 *   员工榜同面；非 ACTIVE 资产不入榜）
 * - **排序（D53 稳定键）**：人 `value desc, user.id asc` · 标签 `value desc, label.id asc` · 资产 `value desc, asset.id desc`
 *
 * 名称解析（**零复制**）：
 * - 标签名 = `labels` 域 `pickDisplayName` 回退链（`zh-CN` → `zh` → `en` → slug，`labels/service.ts` 单点）
 * - 资产名 = `asset` 表**无名字列**（名字是版本投影 `parsed_metadata_json.name`）⇒ 复用
 *   `assets/service.ts::loadAssetItemMeta`（latest 版本投影；缺失 ⇒ 回退 slug）
 */
import { and, asc, count, desc, eq } from 'drizzle-orm';
import { loadAssetItemMeta } from '../assets/service.js';
import type { Db } from '../db/client.js';
import { asset, assetLabel, labelDefinition, user } from '../db/schema/index.js';
import { listManagedLabels, pickDisplayName } from '../labels/service.js';

/** Top N 上界（与前端 Combobox 值域一致 · design D7） */
export const RANKINGS_MAX = 100;
/** Top N 默认（前端先取 10；英雄榜用同一响应的前 3 —— 零额外请求） */
export const RANKINGS_DEFAULT = 10;
/** 标签名解析 locale（看板为中文优先 UI；回退链保证永不空显示） */
const RANK_LOCALE = 'zh-CN';

export interface AdminRankItem {
  /** 人 = `user.id`（工号）· 标签 = slug · 资产 = slug */
  id: string;
  /** 人 = `user.name` · 标签 = 按回退链的显示名 · 资产 = latest 版本投影名（缺失 ⇒ slug） */
  name: string;
  /** 计数（人 = ACTIVE 资产数 · 标签 = 挂载数 · 资产 = `download_count`） */
  value: number;
}

export interface AdminRankings {
  people: AdminRankItem[];
  labels: AdminRankItem[];
  assets: AdminRankItem[];
}

/**
 * 标签名解析：只为**已入选 Top N 的行**取名（label 表规模受 `LABEL_MAX_DEFINITIONS = 100` 约束）。
 * 复用 `listManagedLabels`（含 translations 全量）+ 导出的回退链函数 —— 不在 admin 域重写回退链。
 */
async function resolveLabelNames(
  db: Db,
  rows: Array<{ id: number; slug: string; value: number }>,
): Promise<AdminRankItem[]> {
  if (rows.length === 0) return [];
  const managed = await listManagedLabels(db);
  const byId = new Map(managed.map((m) => [m.id, m]));
  return rows.map((r) => {
    const m = byId.get(r.id);
    return {
      id: r.slug,
      name: m === undefined ? r.slug : pickDisplayName(m.translations, RANK_LOCALE, r.slug),
      value: r.value,
    };
  });
}

export async function getAdminRankings(db: Db, limit: number): Promise<AdminRankings> {
  const [people, labelRows, assetRows] = await Promise.all([
    // ① 人榜：owner 的 ACTIVE 资产数（D46）
    db
      .select({ id: user.id, name: user.name, value: count() })
      .from(asset)
      .innerJoin(user, eq(user.id, asset.ownerId))
      .where(eq(asset.status, 'ACTIVE'))
      .groupBy(user.id, user.name)
      .orderBy(desc(count()), asc(user.id))
      .limit(limit),
    // ② 标签榜：挂载数（D42 重复计入；**不分资产状态** —— 与 `/all.assetCount` 同口径）
    db
      .select({ id: labelDefinition.id, slug: labelDefinition.slug, value: count() })
      .from(labelDefinition)
      .innerJoin(assetLabel, eq(assetLabel.labelId, labelDefinition.id))
      .groupBy(labelDefinition.id, labelDefinition.slug)
      .orderBy(desc(count()), asc(labelDefinition.id))
      .limit(limit),
    // ③ 资产榜：下载数（仅 ACTIVE）
    db
      .select({
        id: asset.id,
        slug: asset.slug,
        value: asset.downloadCount,
        ownerId: asset.ownerId,
        latestVersionId: asset.latestVersionId,
      })
      .from(asset)
      .where(eq(asset.status, 'ACTIVE'))
      .orderBy(desc(asset.downloadCount), desc(asset.id))
      .limit(limit),
  ]);

  const labels = await resolveLabelNames(db, labelRows);
  // 资产名：复用既有元数据批加载（两条查询防 N+1；`ownerDisplayName` 本处不用——同一函数顺带返回）
  const meta = await loadAssetItemMeta(db, assetRows);

  return {
    people,
    labels,
    assets: assetRows.map((r) => ({
      id: r.slug,
      name: meta.get(r.id)?.latestName ?? r.slug,
      value: Number(r.value),
    })),
  };
}
