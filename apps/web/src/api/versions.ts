/** /assets/:slug/versions（版本列表 + 版本详情——文件清单；§5.1/5.3 两波编排数据源） */
import { type ApiGetOptions, type ApiWriteOptions, apiDelete, apiGet, apiPost } from './client.js';
import type { VersionDetail, VersionListResponse } from './types.js';

export interface VersionListParams {
  limit?: number;
  offset?: number;
}

export async function fetchVersionList(
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
    `/api/assets/${encodeURIComponent(slug)}/versions${suffix}`,
    opts,
  );
}

export async function fetchVersionDetail(
  slug: string,
  version: string,
  opts?: ApiGetOptions,
): Promise<VersionDetail> {
  return apiGet<VersionDetail>(
    `/api/assets/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}`,
    opts,
  );
}

/**
 * 删除版本 `DELETE /api/assets/:slug/versions/:version`（M4b-4 T12 加性）⇒ **204 无体**。
 *
 * 服务端两道门（`http/assets.ts:590-614`）：
 * 1. **状态门分治** —— 非 4 态（`DRAFT`/`SCAN_FAILED`/`REJECTED`/`UPLOADED`）⇒ 400 `asset.version_not_deletable`
 * 2. **身份门** —— owner/管理档（`canManageAsset`）删 4 态；上传者本人仅删自己的 `DRAFT`/`SCAN_FAILED`
 *
 * 前端判定是**提示性**的（`VersionListItem` 不含 `createdBy`，上传者例外面不可达）⇒ 以服务端 400 兜底。
 */
export async function deleteVersion(
  slug: string,
  version: string,
  opts?: ApiWriteOptions,
): Promise<void> {
  await apiDelete<void>(
    `/api/assets/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}`,
    opts,
  );
}

/**
 * 撤回分发 `POST /api/assets/:slug/versions/:version/yank`（M4b-4 T12 加性）。
 *
 * 守卫 = **`role >= ADMIN`**（owner 不可，`canYank`）+ `reason` 必填（空 ⇒ 400
 * `asset.yank_reason_required`）+ scope `asset:manage`。响应 `{ status: 'YANKED', latestVersionId }`
 * —— `latestVersionId` 变化意味着详情页的 latest 投影随之变 ⇒ 调用方须**详情重取**。
 */
export async function yankVersion(
  slug: string,
  version: string,
  reason: string,
  opts?: ApiWriteOptions,
): Promise<{ status: string; latestVersionId: string | null }> {
  return apiPost<{ status: string; latestVersionId: string | null }>(
    `/api/assets/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/yank`,
    { reason },
    opts,
  );
}
