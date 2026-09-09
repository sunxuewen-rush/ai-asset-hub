/**
 * label 域业务错误码（M3 design §9——06 §5.2 校验规则 + slug_taken 为 06 补码；
 * 07 §4 结构化 code；独立域 errors.ts 分域先例（review/assets））。
 */
export const labelErrorCodes = {
  /** label 定义不存在（slug 寻址） */
  notFound: 'label.not_found',
  /** 删除带子级的一级分类被拒（06 §5.2——先删/转移子级；DDL RESTRICT 双保险） */
  parentHasChildren: 'label.parent.has_children',
  /** slug 全局唯一冲突（06 §2.1；UNIQUE 23505 兜底） */
  slugTaken: 'label.slug_taken',
  /** 上限超限（每资产 ≤10 挂载——06 §1） */
  limitExceeded: 'label.limit_exceeded',
  /** 锁两级树校验拒（parent 非一级/自指/一级降级/挂二级之下——06 §5.2） */
  invalidParent: 'label.invalid_parent',
  /** 越权（管理面非 SUPER_ADMIN / PRIVILEGED 挂载非超管——06 §3） */
  accessDenied: 'label.access_denied',
  /** 定义总数上限（skillhub label.max-definitions:100 同构——防定义无限膨胀） */
  definitionLimitExceeded: 'label.definition_limit_exceeded',
  /** 同批翻译 locale 重复（skillhub label.translation.locale.duplicate 对齐——应用层预检） */
  translationLocaleDuplicate: 'label.translation.locale_duplicate',
  /** 翻译入参空 locale/displayName（路由 zod 已拦——服务层防御 400；R2-1） */
  translationBlank: 'label.translation.blank',
} as const;

export type LabelErrorCode = (typeof labelErrorCodes)[keyof typeof labelErrorCodes];

/** HTTP 状态映射（穷尽 switch——新增码漏映射即编译错） */
export function httpStatusForLabel(code: LabelErrorCode): number {
  switch (code) {
    case 'label.not_found':
      return 404;
    case 'label.parent.has_children':
    case 'label.limit_exceeded':
    case 'label.invalid_parent':
    case 'label.definition_limit_exceeded':
    case 'label.translation.locale_duplicate':
    case 'label.translation.blank':
      return 400;
    case 'label.slug_taken':
      return 409;
    case 'label.access_denied':
      return 403;
  }
}

/** label 域业务异常：app.onError 认领（同 Auth/Asset/Review 先例） */
export class LabelError extends Error {
  constructor(
    readonly code: LabelErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'LabelError';
  }

  get status(): number {
    return httpStatusForLabel(this.code);
  }
}
