/**
 * 审核面权限判定单点（批 design §4.6 · M4b-5 T8+T9）。
 *
 * 纪律（同 `lib/asset-permissions.ts`）：**逐条对齐服务端真码守卫**，判定只此一处 —— 页面不得散写
 * `submittedBy === userId`、`role >= 10` 之类表达式（防「前端比服务端宽/严」的隐形规则）。
 *
 * | 判定 | 服务端真源 | 语义 |
 * |------|-----------|------|
 * | `canApproveReview` | `http/reviews.ts:105-118`（`rbac.hasRole(userId, ADMIN)`） | `role >= ADMIN` |
 * | `canWithdrawReview` | `review/service.ts` `withdrawReview`（提交人 ∨ 管理档） | 提交人本人 ∨ `role >= ADMIN`，且仅 `PENDING` |
 * | `canViewReview` | `http/reviews.ts` `/:id` 授权 = **管理档 ∨ 提交人** | 二者之一 |
 *
 * **R2（2026-09-21 拍板）后无自审分支**：管理档**可审自己提交的版本** ⇒
 * 动作区**不渲染**「不能审核自己提交的版本」（`errors.review.self_review` 键已退役）。
 *
 * **服务端为唯一门**：本件判定只驱动「渲不渲染 + 可不可点」，最终以服务端
 * `review.access_denied` / `review.not_pending` / `review.comment_required` 为准。
 */
import type { ReviewDetailItem, ReviewStatus } from '../api/reviews.js';
import { hasRole, ROLE } from '../auth/roles.js';
import type { PermissionViewer } from './asset-permissions.js';

/** 审核动作可用性（页面据此决定渲染与禁用；服务端仍为唯一门） */
export interface ReviewActionAvailability {
  /** 通过（`reason='optional'`） */
  approve: boolean;
  /** 驳回（`reason='required'`） */
  reject: boolean;
  /** 撤回（`reason='none'`） */
  withdraw: boolean;
  /** 提交已裁决 ⇒ 动作区渲染「该提交已被处理」静态行（三动作皆不可用） */
  processed: boolean;
  /** 提交人（非管理档）在 `PENDING` 下的说明行（`review.adminOnly`） */
  adminOnlyHint: boolean;
}

/** 仅管理档可裁决（通过 / 驳回）—— 对齐 `http/reviews.ts` 的两处 `hasRole(..., ADMIN)` */
export function canApproveReview(viewer: Pick<PermissionViewer, 'role'>): boolean {
  return hasRole(viewer.role, ROLE.ADMIN);
}

/** 可撤回 = （提交人本人 ∨ 管理档）且提交仍在 `PENDING` —— 对齐 `review/service.ts` 的 withdraw 授权 + 状态门 */
export function canWithdrawReview(
  detail: Pick<ReviewDetailItem, 'submittedBy' | 'status'>,
  viewer: PermissionViewer,
): boolean {
  if (detail.status !== 'PENDING') return false;
  if (viewer.userId !== null && viewer.userId === detail.submittedBy) return true;
  return hasRole(viewer.role, ROLE.ADMIN);
}

/** 可查看详情 = 管理档 ∨ 提交人（与 `http/reviews.ts` `/:id` 授权同判 —— 前端仅供守卫体验层） */
export function canViewReview(
  detail: Pick<ReviewDetailItem, 'submittedBy'>,
  viewer: PermissionViewer,
): boolean {
  if (viewer.userId !== null && viewer.userId === detail.submittedBy) return true;
  return hasRole(viewer.role, ROLE.ADMIN);
}

/** 三动作可用性汇总（页面单点消费，避免在 JSX 里散写条件） */
export function reviewActionAvailability(
  detail: Pick<ReviewDetailItem, 'submittedBy' | 'status'>,
  viewer: PermissionViewer,
): ReviewActionAvailability {
  const pending = detail.status === 'PENDING';
  const canVerdict = pending && canApproveReview(viewer);
  const canWithdraw = canWithdrawReview(detail, viewer);
  return {
    approve: canVerdict,
    reject: canVerdict,
    withdraw: canWithdraw,
    processed: !pending,
    adminOnlyHint: pending && !canApproveReview(viewer),
  };
}

/**
 * 状态 → i18n 键（`review.status.*`；四态同轴）。
 * ⚠️ 用 `as const satisfies` 而非 `Record<…, string>`：后者会把值宽化成 `string` ⇒
 * `t('review', …)` 的收窄键类型不接受（体例照 `Submissions.tsx` 的 `STATUS_KEY`）。
 */
export const REVIEW_STATUS_KEY = {
  PENDING: 'status.pending',
  APPROVED: 'status.approved',
  REJECTED: 'status.rejected',
  WITHDRAWN: 'status.withdrawn',
} as const satisfies Record<ReviewStatus, string>;
