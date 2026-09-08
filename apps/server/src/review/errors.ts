/**
 * review 域业务错误码（M3 design §9——分域单源；07 §4 结构化 code，前端按 code 映射 i18n）。
 * 资产域码在 assets/errors.ts（submit 前态错等跨域消费）；本域只管 review.*。
 * 认证装配错误格式 07 §4；app.onError 认领（T7 路由装配时接入——auth/assets 先例）。
 */
export const reviewErrorCodes = {
  /** review task 不存在 */
  notFound: 'review.not_found',
  /** 同版本重复 submit（PENDING 部分唯一索引防并发——业务预检 + 23505 兜底） */
  alreadyPending: 'review.already_pending',
  /** 非 PENDING 不可审/撤（含并发双审——条件更新 0 行） */
  notPending: 'review.not_pending',
  /** 防自审（05 §6.4：审核人不得是提交人——权限违背族 403，SUPER_ADMIN 例外由调用方放行） */
  selfReview: 'review.self_review',
  /** reject 必须给理由（skillhub RejectReviewRequest 同构——修正方据理由改） */
  commentRequired: 'review.comment_required',
  /** 审核详情/任务越权可见（AIH 明示哲学——对齐 skillhub review.no_permission；design 补项） */
  accessDenied: 'review.access_denied',
} as const;

export type ReviewErrorCode = (typeof reviewErrorCodes)[keyof typeof reviewErrorCodes];

/** HTTP 状态映射（穷尽 switch——新增码漏映射即编译错；design 纪律同 assets 域） */
export function httpStatusForReview(code: ReviewErrorCode): number {
  switch (code) {
    case 'review.not_found':
      return 404;
    case 'review.already_pending':
    case 'review.not_pending':
    case 'review.comment_required':
      return 400;
    case 'review.self_review':
    case 'review.access_denied':
      return 403;
  }
}

/** review 域业务异常：路由层统一转 { code, message } 响应（app.onError 认领） */
export class ReviewError extends Error {
  constructor(
    readonly code: ReviewErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ReviewError';
  }

  get status(): number {
    return httpStatusForReview(this.code);
  }
}
