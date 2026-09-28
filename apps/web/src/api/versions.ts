/** /assets/:slug/versions（版本列表 + 版本详情——文件清单；§5.1/5.3 两波编排数据源） */
import {
  type ApiGetOptions,
  type ApiUploadOptions,
  type ApiWriteOptions,
  apiDelete,
  apiGet,
  apiPost,
  apiUpload,
} from './client.js';
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

/**
 * 上传版本响应（服务端 `CreatedVersion` 逐字段照抄 —— `assets/versions.ts:34-41`）。
 *
 * ⚠ 类型定义**随件**（不进 `api/types.ts`）：批 design §3.2 的件面只列 M5/M6/M7 三件，
 * 不动 `types.ts`（保件面闭合）；若后续要归并到 `types.ts` 集中式，另批议。
 */
export interface CreatedVersion {
  id: number;
  assetId: number;
  version: string;
  /** 上传落 `DRAFT`（服务端硬编码该字面量，见 `versions.ts` 返回处） */
  status: 'DRAFT';
  fileCount: number;
  totalSize: number;
}

export interface UploadVersionInput {
  /** zip 包体（浏览器 `File`） */
  file: File | Blob;
  /** 显式版本号（semver；撞号 ⇒ 409 `asset.version_conflict`） */
  version: string;
  /** 可选；服务端 ≤4096，超长 ⇒ 400 `request.invalid` */
  changelog?: string;
}

/**
 * 上传版本 `POST /api/assets/:slug/versions`（M4b-7 T4 加性 · design §4.5 跳 2）。
 *
 * multipart 字段名与类型**照服务端解析**（`http/assets.ts` 上传端点实证）：`file`（必填）+
 * `version`（必填 semver）+ `changelog`（可选）⇒ **201 `CreatedVersion`（`status='DRAFT'`）**。
 * 走 `apiUpload`（XHR）⇒ 具备**上传进度**与 `abort()`；429 带 `retryAfterSec`（调用方按需消费）。
 */
export function uploadVersion(
  slug: string,
  input: UploadVersionInput,
  opts?: Omit<ApiUploadOptions, 'file' | 'fields' | 'fileField'>,
): Promise<CreatedVersion> {
  return apiUpload<CreatedVersion>(`/api/assets/${encodeURIComponent(slug)}/versions`, {
    file: input.file,
    fields: {
      version: input.version,
      ...(input.changelog === undefined ? {} : { changelog: input.changelog }),
    },
    ...opts,
  });
}

/** 提审响应（服务端 `assets.ts` 提审端点 `return c.json({…}, 201)` 逐字段照抄） */
export interface SubmitVersionResult {
  taskId: number;
  reviewVersion: number;
  status: 'PENDING_REVIEW';
}

/**
 * 提审 `POST /api/assets/:slug/versions/:version/submit`（M4b-7 T5 加性 · design §4.4 跳 3）。
 *
 * ⚠ **本条为补件**（设计漏项 **F227**）：批 design §4.4 的跳 3 必须调本端点，但 §3.2 的 M7 行
 * 只写了 `uploadVersion` ⇒ 前端此前**没有**任何 submit 封装（全仓 grep 零命中）。处置 = 在**同一件**
 * （`api/versions.ts` = M7）补齐，**不开新件** ⇒ 件面保持闭合。
 *
 * 契约：body 传 `{}`（服务端不解析体；按仓内 POST 约定显式给空对象，避免无体被判 400/415）
 * ⇒ **201 `{ taskId, reviewVersion, status: 'PENDING_REVIEW' }`**；前态门仅 `DRAFT`/`UPLOADED`
 * ⇒ 一键链第二跳刚落 `DRAFT`，**无状态竞态**（design §2.2 承接行）。失败：`400
 * asset.version_not_submittable` · `403 auth.forbidden`（跳 3 已建版本 ⇒ 停点不回滚）。
 */
export async function submitVersion(
  slug: string,
  version: string,
  opts?: ApiWriteOptions,
): Promise<SubmitVersionResult> {
  return apiPost<SubmitVersionResult>(
    `/api/assets/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/submit`,
    {},
    opts,
  );
}
