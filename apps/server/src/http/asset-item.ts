/**
 * 资产响应序列化件（M4b-4 **T1**：从 `http/assets.ts` 与 `assets/service.ts` 迁出，供
 * `http/assets.ts`（公开面）与 `http/me.ts`（个人面 R6）共用 —— **一份形状、两处消费**）。
 *
 * 形状 = 详情/注册/列表共用（坐标 = 全局唯一裸 `slug`，M4-pre §2.3）。
 * - M4a R5/R6：`meta`（latest 版本投影 + owner 显示名）为可选注入 —— 缺省（注册场景）字段 null。
 * - M4b-4 v1.8 §5.1 ⑧：`starCount` 直读冗余列；`starredByMe` 由调用方注入（**匿名 ⇒ false**，
 *   列表用 `starredAssetIds` 一次 inArray 防 N+1，详情/写后回读用 `hasStarred`）。
 *
 * **T1 实现期偏差（已登记）**：`AssetItemMeta` **保留在 `assets/service.ts`**（未随 `assetItem()` 迁出）——
 * 因为它是 `loadAssetItemMeta()` 的返回类型，迁到 http 层会让 service 反向依赖 http（分层倒置）。
 * 迁出本件的目的（形状单点）不受影响：两处调用方都从本件取 `assetItem`。
 */

import type { AssetItemMeta, AssetRow } from '../assets/service.js';

export function assetItem(row: AssetRow, meta?: AssetItemMeta | null, starredByMe = false) {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    status: row.status,
    ownerId: row.ownerId,
    /** 当前版本指针（M3 起 approve/yank 维护——详情暴露供消费者取 latest） */
    latestVersionId: row.latestVersionId,
    /** R5：latest 版本展示投影（latest_version join——批注入防 N+1） */
    latestVersion: meta?.latestVersion ?? null,
    latestName: meta?.latestName ?? null,
    latestDescription: meta?.latestDescription ?? null,
    /** R6：owner 显示名（官方 `user.name`——LDAP 建号同步 05 §3.1） */
    ownerDisplayName: meta?.ownerDisplayName ?? null,
    downloadCount: row.downloadCount,
    /** 收藏热度计数（M4b-4 v1.8：冗余列直读，零额外查询） */
    starCount: row.starCount,
    /** 我是否已收藏（匿名 ⇒ false） */
    starredByMe,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
