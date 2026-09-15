/**
 * 业务错误码（07 §4 结构化 code 返回；前端按 code 映射 i18n，服务端不返回成品文案）。
 * 认证域错误码集中于此；资产协议错误码在 @ai-asset-hub/protocol。
 */

export const authErrorCodes = {
  invalidCredentials: 'auth.invalid_credentials',
  usernameInvalid: 'auth.username_invalid',
  usernameTaken: 'auth.username_taken',
  passwordTooWeak: 'auth.password_too_weak',
  registrationDisabled: 'auth.registration_disabled',
  userDisabled: 'auth.user_disabled',
  userPending: 'auth.user_pending',
  userLocked: 'auth.user_locked',
  ldapDenied: 'auth.ldap_denied',
  /** 目录身份缺邮箱（05 §3.1：邮箱只能取自目录，**绝不合成**） */
  emailMissing: 'auth.email_missing',
  /** 目录邮箱与既有账号冲突（同邮箱两身份 → 拒绝，人工处置） */
  emailConflict: 'auth.email_conflict',
  rateLimited: 'auth.rate_limited',
  csrfFailed: 'auth.csrf_failed',
  sessionExpired: 'auth.session_expired',
  forbidden: 'auth.forbidden',
  oidcStateMismatch: 'auth.oidc_state_mismatch',
  oidcDenied: 'auth.oidc_denied',
  deviceCodeInvalid: 'auth.device_code_invalid',
  /** RFC 8628：用户尚未确认（轮询继续） */
  authorizationPending: 'auth.authorization_pending',
  deviceExpired: 'auth.device_expired',
} as const;

export type AuthErrorCode = (typeof authErrorCodes)[keyof typeof authErrorCodes];

/** 认证域用到的最小状态码集合（窄并集：调用方无需断言即可直接传给官方 `ctx.error`） */
export type AuthErrorStatus = 400 | 401 | 403 | 404 | 409 | 429;

/** HTTP 状态映射（07 §4：code 结构化，状态码语义精确；登录类统一 401 防枚举泄露） */
export function httpStatusFor(code: AuthErrorCode): AuthErrorStatus {
  switch (code) {
    case 'auth.invalid_credentials':
    case 'auth.user_disabled':
    case 'auth.user_pending':
    case 'auth.user_locked':
    case 'auth.session_expired':
    case 'auth.device_expired':
      return 401;
    case 'auth.username_invalid':
    case 'auth.password_too_weak':
    case 'auth.authorization_pending':
    case 'auth.email_missing':
      return 400;
    case 'auth.device_code_invalid':
      return 404;
    case 'auth.username_taken':
    case 'auth.email_conflict':
      return 409;
    case 'auth.registration_disabled':
    case 'auth.ldap_denied':
    case 'auth.csrf_failed':
    case 'auth.forbidden':
    case 'auth.oidc_state_mismatch':
    case 'auth.oidc_denied':
      return 403;
    case 'auth.rate_limited':
      return 429;
  }
}

/** 业务异常：route 层统一转 { code, message } 响应 */
export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
  }

  get status(): number {
    return httpStatusFor(this.code);
  }
}

/** 统一错误响应体（07 §4） */
export interface ErrorResponse {
  code: string;
  message: string;
}
