/**
 * 看板「**一级标签上卷**」口径的**单点**（`overview.labels[]` 与 `rankings.labels` 共用）。
 *
 * 为什么单独成文件：口径（只列一级 / 子标签上卷到父 / 仅 `ACTIVE` / 去重）此前**在两处各写一遍** SQL ——
 * 正是本批修完的那类「同一口径两处漂移」隐患（改一处漏一处 ⇒ 看板与排行榜数字打架）。
 * 现把 ① 父表别名 ② 根标签 id/slug 归一表达式 ③ 上卷连接条件 收在此处；
 * 两处调用方只保留各自的**聚合方式**（`overview` 需 count 与 downloads 同集合 ⇒ `selectDistinct` + JS 归并；
 * `rankings` 需排序 + limit ⇒ SQL 侧 `countDistinct`）。
 *
 * 口径 SSOT = 批 design §4.1(c)(d)/§5.1 + 拍板 17a/19.1b；三处同面之第三处 = `labels/service.ts::assetCount`。
 */
import { eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { labelDefinition } from '../db/schema/index.js';

/** 父表别名（同一查询内两次引用 `label_definition` 时必须复用同一个别名实例） */
export function labelRollupParent() {
  return alias(labelDefinition, 'parent_label');
}

/** 别名实例类型（供调用方声明变量） */
export type LabelRollupParent = ReturnType<typeof labelRollupParent>;

/** 根标签 id = `coalesce(父标签 id, 自身 id)`（一级标签自身即根） */
export function rootLabelId(parent: LabelRollupParent) {
  return sql<number>`coalesce(${parent.id}, ${labelDefinition.id})`;
}

/** 根标签 slug = `coalesce(父 slug, 自身 slug)`（必须与 `rootLabelId` 取同一个 coalesce） */
export function rootLabelSlug(parent: LabelRollupParent) {
  return sql<string>`coalesce(${parent.slug}, ${labelDefinition.slug})`;
}

/** 上卷连接条件：`labelDefinition.parent_id = parent.id`（配 `leftJoin` —— 一级标签无父 ⇒ 取自身） */
export function labelRollupOn(parent: LabelRollupParent) {
  return eq(labelDefinition.parentId, parent.id);
}
