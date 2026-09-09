/** /assets/:ns/:slug/versions（版本列表 + 版本详情——文件清单；§5.1/5.3 两波编排数据源） */
import { type ApiGetOptions, apiGet } from './client.js';
import type { VersionDetail, VersionListResponse } from './types.js';

export interface VersionListParams {
  limit?: number;
  offset?: number;
}

export async function fetchVersionList(
  nsSlug: string,
  slug: string,
  params: VersionListParams = {},
  opts?: ApiGetOptions,
): Promise<VersionListResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    query.set(key, String(value));
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiGet<VersionListResponse>(
    `/api/assets/${encodeURIComponent(nsSlug)}/${encodeURIComponent(slug)}/versions${suffix}`,
    opts,
  );
}

export async function fetchVersionDetail(
  nsSlug: string,
  slug: string,
  version: string,
  opts?: ApiGetOptions,
): Promise<VersionDetail> {
  return apiGet<VersionDetail>(
    `/api/assets/${encodeURIComponent(nsSlug)}/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}`,
    opts,
  );
}
