/**
 * 业务错误码（07 §4 结构化 code 返回；前端按 code 映射 i18n，服务端不返回成品文案）。
 * 认证域错误码集中于此；资产协议错误码在 @ai-asset-hub/protocol。
 */

export const authErrorCodes = {
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
} as const;

/**
 * M4b-pre T7 清理：随自研通道下线而删除的码（不回补——官方件已承担对应错误面）
 * - `auth.username_invalid` / `auth.username_taken` / `auth.password_too_weak` /
 *   `auth.registration_disabled` —— 自研注册通道（T3 起交官方 `sign-up/email`；校验错误由官方返回）
 * - `auth.user_locked` —— 行级失败锁定列（`local_credential`）随表删除；防爆破由登录限流承担
 * - `auth.device_code_invalid` / `auth.authorization_pending` / `auth.device_expired` ——
 *   设备流交官方（T5）：错误一律 400 + OAuth 体 `{error, error_description}`
 *   （`slow_down`/`authorization_pending`/`expired_token`/`access_denied`/`invalid_grant`），
 *   **不映射**为本表的结构化 `auth.*` 码（design §8 设备面登记）
 */

export type AuthErrorCode = (typeof authErrorCodes)[keyof typeof authErrorCodes];

/**
 * 官方 admin 插件的封禁码（真码 `better-auth/dist/plugins/admin/error-codes.mjs`）。
 *
 * 本仓账号状态门（`identity.ts` 的 `statusError`）**沿用官方码**而非自绘码 ——
 * 官方 `banned` 检查挂在 `session.create` 上（真码 `dist/plugins/admin/admin.mjs`），
 * 与本仓状态门**同一语义**（停用即拒）⇒ 码面统一，避免两套。
 */
export const OFFICIAL_BANNED_CODE = 'BANNED_USER' as const;

/** 认证面**可见码** = 我方保留码 ∪ 官方码（本批仅封禁一枚） */
export type AuthSurfaceCode = AuthErrorCode | typeof OFFICIAL_BANNED_CODE;

/** 认证域用到的最小状态码集合（窄并集：调用方无需断言即可直接传给官方 `ctx.error`） */
export type AuthErrorStatus = 400 | 401 | 403 | 404 | 409 | 429;

/** HTTP 状态映射（07 §4：code 结构化，状态码语义精确；登录类统一 401 防枚举泄露） */
export function httpStatusFor(code: AuthSurfaceCode): AuthErrorStatus {
  switch (code) {
    case 'auth.session_expired':
      return 401;
    case 'auth.email_missing':
      return 400;
    case 'auth.email_conflict':
      return 409;
    case 'auth.csrf_failed':
    case 'auth.forbidden':
    case 'auth.oidc_state_mismatch':
    case 'auth.oidc_denied':
      return 403;
    case 'auth.rate_limited':
      return 429;
    /** 官方封禁（`FORBIDDEN` 同档 —— 真码 `dist/plugins/admin/admin.mjs` 用 `FORBIDDEN`） */
    case OFFICIAL_BANNED_CODE:
      return 403;
  }
}

/** 业务异常：route 层统一转 { code, message } 响应 */
export class AuthError extends Error {
  constructor(
    readonly code: AuthSurfaceCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
  }

  get status(): number {
    return httpStatusFor(this.code);
  }
}
