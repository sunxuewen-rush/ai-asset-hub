/** /api/assets（§5.1：q · label 多值 OR · type · limit≤100 默认 20 · offset · 默认 updated_at desc） */
import { type ApiGetOptions, apiGet } from './client.js';
import type { AssetItem, AssetListResponse, AssetType } from './types.js';

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
