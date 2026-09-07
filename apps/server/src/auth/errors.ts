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
  rateLimited: 'auth.rate_limited',
  csrfFailed: 'auth.csrf_failed',
  sessionExpired: 'auth.session_expired',
  forbidden: 'auth.forbidden',
} as const;

export type AuthErrorCode = (typeof authErrorCodes)[keyof typeof authErrorCodes];

/** HTTP 状态映射（07 §4：code 结构化，状态码语义精确；登录类统一 401 防枚举泄露） */
export function httpStatusFor(code: AuthErrorCode): number {
  switch (code) {
    case 'auth.invalid_credentials':
    case 'auth.user_disabled':
    case 'auth.user_pending':
    case 'auth.user_locked':
    case 'auth.session_expired':
      return 401;
    case 'auth.username_invalid':
    case 'auth.password_too_weak':
      return 400;
    case 'auth.username_taken':
      return 409;
    case 'auth.registration_disabled':
    case 'auth.ldap_denied':
    case 'auth.csrf_failed':
    case 'auth.forbidden':
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
