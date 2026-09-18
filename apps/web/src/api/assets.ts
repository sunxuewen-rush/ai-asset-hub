/** /api/assets（§5.1：q · label 多值 OR · type · limit≤100 默认 20 · offset · 默认 updated_at desc） */
import { type ApiGetOptions, type ApiWriteOptions, apiDelete, apiGet, apiPatch } from './client.js';
import type { AssetItem, AssetListResponse, AssetStatus, AssetType } from './types.js';

export interface AssetListParams {
  q?: string;
  /** 多值 = OR（服务端 label 多值语义） */
  labels?: readonly string[];
  type?: AssetType;
  limit?: number;
  offset?: number;
}

export async function fetchAssetList(params: AssetListParams = {}, opts?: ApiGetOptions) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (key === 'labels') {
      for (const label of params.labels ?? []) query.append('label', label);
      continue;
    }
    query.set(key, String(value));
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiGet<AssetListResponse>(`/api/assets${suffix}`, opts);
}

/** 资产详情（扁平化坐标：全局唯一裸 slug） */
export async function fetchAssetDetail(slug: string, opts?: ApiGetOptions) {
  return apiGet<AssetItem>(`/api/assets/${encodeURIComponent(slug)}`, opts);
}

/**
 * 状态治理 `PATCH /api/assets/:slug/status`（M4b-4 T12 加性）。
 *
 * 服务端守卫 = `assertManageable`（owner 本人 ∨ `role ≥ ADMIN`）⇒ 失败 `auth.forbidden`；
 * 非法状态值 ⇒ 400 `request.invalid`。响应为单条 `AssetItem`，但**元信息为 `null`**
 * （服务端 `assetItem(updated, null, …)`）⇒ 调用方**不发散消费该响应**，成功后走详情重取
 * （批 design §4.6「局部重取」口径）。
 */
export async function patchAssetStatus(
  slug: string,
  status: AssetStatus,
  opts?: ApiWriteOptions,
): Promise<void> {
  await apiPatch<AssetItem>(`/api/assets/${encodeURIComponent(slug)}/status`, { status }, opts);
}

/**
 * 删除资产 `DELETE /api/assets/:slug`（M4b-4 T12 加性）⇒ **204 无体**。
 *
 * 服务端守卫 = `assertManageable`；**存在 `PUBLISHED` ⇒ 400 `asset.has_published`**、
 * **存在 `YANKED` ⇒ 400 `asset.has_yanked`**（条件升级，M3 R10）—— 两类失败由调用方
 * 以 `errors.asset.has_published` / `errors.asset.has_yanked` 文案提示。
 */
export async function deleteAsset(slug: string, opts?: ApiWriteOptions): Promise<void> {
  await apiDelete<void>(`/api/assets/${encodeURIComponent(slug)}`, opts);
}
