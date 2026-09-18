/** /api/labels（公开候选面）+ 资产标签挂载写面（M4b-4 T12 加性） */
import { type ApiGetOptions, type ApiWriteOptions, apiDelete, apiGet, apiPut } from './client.js';
import type { LabelDto } from './types.js';

/**
 * 标签候选（公开读面）。
 *
 * ⚠️ **恒不含 `PRIVILEGED`**（`labels/service.ts` 只返 `RECOMMENDED` + `visibleInFilter`）
 * ⇒ 超管亦无特权标签候选源（批 design §2.1 Q7 ① 拍板）——「添加标签」选择器只用本函数。
 */
export async function fetchLabels(opts?: ApiGetOptions): Promise<readonly LabelDto[]> {
  return apiGet<readonly LabelDto[]>('/api/labels', opts);
}

/**
 * 添加标签 `PUT /api/assets/:slug/labels/:labelSlug`（M4b-4 T12 加性）⇒ **204 无体**。
 *
 * 服务端判定（`labels/service.ts`）：`RECOMMENDED` ⇒ `canManageAsset`（owner/管理档）；
 * `PRIVILEGED` ⇒ **仅超管**（否则 `label.access_denied`）；已挂 ≥10 ⇒ `label.limit_exceeded`。
 * 幂等：重复挂载 ⇒ 204。
 */
export async function attachLabel(
  slug: string,
  labelSlug: string,
  opts?: ApiWriteOptions,
): Promise<void> {
  await apiPut<void>(
    `/api/assets/${encodeURIComponent(slug)}/labels/${encodeURIComponent(labelSlug)}`,
    opts,
  );
}

/** 移除标签 `DELETE /api/assets/:slug/labels/:labelSlug`（M4b-4 T12 加性）⇒ **204 无体**（幂等） */
export async function detachLabel(
  slug: string,
  labelSlug: string,
  opts?: ApiWriteOptions,
): Promise<void> {
  await apiDelete<void>(
    `/api/assets/${encodeURIComponent(slug)}/labels/${encodeURIComponent(labelSlug)}`,
    opts,
  );
}
