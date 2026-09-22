/**
 * /api/reviews（M4b-3 T4：**我的提交**读面 + 撤回）。
 *
 * 契约（批 design §4.1 / 主 design §7.1）：
 * - `GET /api/reviews/mine?status=&limit=&offset=` ⇒ `{ items, total, limit, offset }`
 *   （M4b-3 T1 起 item 增 `reviewComment` / `assetType`）
 * - `POST /api/reviews/:id/withdraw` ⇒ **204**（无响应体；服务端语义 = 版本退回 `UPLOADED`）
 *
 * ⚠️ `status` 省略 = 全部；服务端对**非法值静默忽略**（`review/query.ts:parseReviewStatus`）
 * ⇒ 前端「全部」必须**不传**该参数（**不可传 `ALL` / 空串**，R3）。
 */
import { type ApiGetOptions, type ApiWriteOptions, apiGet, apiPost } from './client.js';
import type { AssetType, VersionFileEntry } from './types.js';

/** review task 状态（与 `08 §6` / 服务端 `review/query.ts` 同轴；**与版本八态不同轴**） */
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

/**
 * 我的提交列表项（服务端 `ReviewListItem` 的同形投影）。
 *
 * ⚠️ 刻意用 **type 别名**而非 `interface`：`DataTable` 的行约束为 `Record<string, unknown> | unknown[]`
 * （等价 TanStack `RowData`），**interface 不带隐式索引签名** ⇒ 无法作为行类型传入；type 别名可以。
 * 官方 shadcn data-table recipe 同样以 `type X = {...}` 声明行类型（T6 执行期实证）。
 */
export type MyReviewItem = {
  taskId: number;
  status: ReviewStatus;
  /** 评审计数（`08 §6` 重审递增） */
  reviewVersion: number;
  submittedBy: string;
  /** ISO 字符串（JSON 传输） */
  submittedAt: string;
  assetSlug: string;
  assetVersion: string;
  versionStatus: string;
  versionId: number;
  /** M4b-3 T1 加性：驳回原因（仅 `REJECTED` 行有值，其余 `null`） */
  reviewComment: string | null;
  /** M4b-3 T1 加性：资产类型（列序「资产 → **类型** → 状态 …」的取值来源） */
  assetType: AssetType;
  /**
   * **M4b-5 T2 加性**：提交人**本地**显示名（服务端 `leftJoin(user)` ⇒ `user.name`）。
   * `null` = 用户行缺失（**FK + 软删语义下不可达** —— 防御性类型，见批 design §5.1b F175）。
   * ⚠️ 本地表取值，**不在读面实时查 LDAP**（读面不引入目录可达性抖动）。
   */
  submittedByName: string | null;
};

/**
 * 审核详情（服务端 `ReviewDetailItem` 同形投影 —— M4b-5 T2 加性字段）。
 */
export type ReviewDetailItem = MyReviewItem & {
  /** **M4b-5 T2 加性（仅详情）**：当前**已发布版本**号；`null` = 该资产从未发布过（首版审核 ⇒ 变更对比卡不渲染） */
  latestVersion: string | null;
  /**
   * manifest 原文（**jsonb 已解析对象** —— 服务端 `ReviewDetailItem.manifestJson:
   * Record<string, unknown> | null`（`review/query.ts:59`）· 与 `api/types.ts:135` 同形）。
   * ⚠️ F187：首稿曾误写 `string`（jsonb 由驱动解析，**不是** JSON 字符串）。
   */
  manifestJson: Record<string, unknown> | null;
  /** 该版本文件清单（`{filePath,fileSize,sha256}`） */
  files: readonly VersionFileEntry[];
};

/** 审核动作响应（approve / reject 同为 200 + 该形状） */
export type ReviewActionResponse = {
  taskId: number;
  status: 'APPROVED' | 'REJECTED';
  /** 被裁决的版本号 */
  version: string;
};

export interface MyReviewListResponse {
  items: MyReviewItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface MyReviewsParams {
  /** 省略 = 全部（**切勿传 `'ALL'` / `''`**——服务端静默忽略非法值，传了等于没筛） */
  status?: ReviewStatus;
  limit?: number;
  offset?: number;
}

/** 我的提交列表（登录面——本人提交，无权限码） */
export async function fetchMyReviews(
  params: MyReviewsParams = {},
  opts?: ApiGetOptions,
): Promise<MyReviewListResponse> {
  const query = new URLSearchParams();
  if (params.status !== undefined) query.set('status', params.status);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiGet<MyReviewListResponse>(`/api/reviews/mine${suffix}`, opts);
}

/** 撤回提审（仅 `PENDING` 可用；成功 = 204，无响应体） */
export async function withdrawReview(taskId: number, opts?: ApiWriteOptions): Promise<void> {
  await apiPost<void>(`/api/reviews/${taskId}/withdraw`, {}, opts);
}

/**
 * 审核队列（M4b-4 T5 加性 —— 工作台「待审核」卡；**M4b-5 队列页复用**）。
 * `GET /api/reviews?status=&limit=&offset=` ⇒ `{ items, total, limit, offset }`（同一 `ReviewListItem` 形状）。
 * ⚠️ 与 `/mine` 同口径：`status` 省略 = 全部（**不可传 `ALL`**）；服务端对非法值静默忽略。
 */
export async function fetchReviewQueue(
  params: { status?: ReviewStatus; limit?: number; offset?: number } = {},
  opts?: ApiGetOptions,
) {
  const query = new URLSearchParams();
  if (params.status !== undefined) query.set('status', params.status);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return apiGet<{ items: readonly MyReviewItem[]; total: number; limit: number; offset: number }>(
    `/api/reviews${suffix}`,
    opts,
  );
}

/**
 * 审核详情（M4b-5 T7 加性客户端）——`GET /api/reviews/:id`
 * 授权 = **管理档 ∨ 提交人**（服务端 `http/reviews.ts`）；403 ⇒ `review.access_denied`。
 */
export async function fetchReviewDetail(
  taskId: number,
  opts?: ApiGetOptions,
): Promise<ReviewDetailItem> {
  return apiGet<ReviewDetailItem>(`/api/reviews/${taskId}`, opts);
}

/**
 * 通过（M4b-5 · scope `review:approve`）——`POST /api/reviews/:id/approve` ⇒ 200 `{taskId,status,version}`。
 * `comment` **可选**（≤2000）；省略 / 空串 ⇒ 不发字段（服务端 `APPROVE_BODY` 允许缺省）。
 */
export async function approveReview(
  taskId: number,
  comment?: string,
  opts?: ApiWriteOptions,
): Promise<ReviewActionResponse> {
  const body = comment !== undefined && comment !== '' ? { comment } : {};
  return apiPost<ReviewActionResponse>(`/api/reviews/${taskId}/approve`, body, opts);
}

/**
 * 驳回（M4b-5 · scope `review:approve`）——`POST /api/reviews/:id/reject` ⇒ 200 `{taskId,status,version}`。
 * `comment` **必填**（1..2000；服务端 `REJECT_BODY` + 服务内校验 ⇒ 空串直接 400 `request.invalid`）。
 */
export async function rejectReview(
  taskId: number,
  comment: string,
  opts?: ApiWriteOptions,
): Promise<ReviewActionResponse> {
  return apiPost<ReviewActionResponse>(`/api/reviews/${taskId}/reject`, { comment }, opts);
}
