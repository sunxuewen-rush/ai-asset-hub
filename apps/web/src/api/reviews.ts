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
import type { AssetType } from './types.js';

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
