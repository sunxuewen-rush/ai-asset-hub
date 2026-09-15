import type { Context, Next } from 'hono';
import type { AihAuth } from '../auth/better-auth.js';

/**
 * 业务面同源守卫（M4b-pre T3 收尾：`csrfProtection` 删除后的防线回归 · design §4.1/R9）。
 *
 * 背景：T3 把认证面整体交官方 better-auth，自研 `auth/csrf.ts` 随之删除——官方 origin 校验
 * 仅作用于官方 handler 平面（`/api/auth/*`），业务面（`/api/assets`、`/api/tokens` …）的
 * cookie 写请求自此只剩 cookie `SameSite=Lax` 挡跨**站**（兄弟子域「同站跨源」不再拦）。
 * 本守卫把这一层补回到业务面，且**不重写比较逻辑**：白名单与官方共用
 * `auth.$context.isTrustedOrigin()`（同一 `trustedOrigins`：`baseURL` 推导 + `AUTH_TRUSTED_ORIGINS`）。
 *
 * 语义与官方 `validateOrigin`（`better-auth/dist/api/middlewares/origin-check.mjs`）同构：
 * 1. 安全方法（GET/HEAD/OPTIONS）不校验
 * 2. `Authorization: Bearer` 显式凭证通道跳过（跨站页面无法附带受害者 Bearer 头——旧 `csrf.ts` T17 规则保留）
 * 3. **无 `cookie` 请求头**跳过（CLI / 匿名通道；官方同款 `useCookies` 门）
 * 4. `origin` → 回退 `referer`；两者皆缺（或字面 `null`）→ 403
 * 5. `origin: null` 且 `Sec-Fetch-Site: same-origin` → 以请求自身 origin 参与校验（官方同款回退）
 * 6. 非白名单 → 403
 *
 * 出口错误码沿用删除前 `auth.csrf_failed`（07 §4 结构化 `{code,message}`；前端映射表无需新增项）。
 *
 * 适用路径：`/api/*` 中除官方 handler 平面（`/api/auth/*`）以外的全部路由；自留的
 * `/api/auth/device/*` 属 cookie 写通道（`approve`）故仍在守卫内（官方平面请求由官方自校验，
 * 重复校验会覆盖官方错误码，故显式排除）。
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** 官方 handler 平面前缀（自带 origin 校验） */
const OFFICIAL_PLANE = '/api/auth/';
/** 官方平面内仍需守卫的自留路由（cookie 写通道；T5 交官方后本例外回收） */
const SELF_MANAGED_IN_AUTH_PLANE = '/api/auth/device/';

export function trustedOriginGuard(auth: AihAuth) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    if (path.startsWith(OFFICIAL_PLANE) && !path.startsWith(SELF_MANAGED_IN_AUTH_PLANE)) {
      await next();
      return;
    }
    if (SAFE_METHODS.has(c.req.method)) {
      await next();
      return;
    }
    // Bearer 显式通道：cookie 会话不参与（含无效 Bearer 不降级——防凭证混淆）
    if (c.get('authVia') === 'bearer') {
      await next();
      return;
    }
    // 官方同构：无 cookie 请求头 ⇒ 非浏览器凭证通道，不校验（CLI / 匿名由路由层判 401）
    if (!c.req.header('cookie')) {
      await next();
      return;
    }

    const origin = c.req.header('origin');
    const candidate =
      origin === 'null' && c.req.header('sec-fetch-site') === 'same-origin'
        ? new URL(c.req.url).origin
        : (origin ?? c.req.header('referer') ?? '');

    if (!candidate || candidate === 'null') {
      return c.json({ code: 'auth.csrf_failed', message: 'missing origin or referer' }, 403);
    }

    // 注意：官方 `isTrustedOrigin` 是上下文对象上的方法（内部读 `this.trustedOrigins`，
    // `create-context.mjs:143`）——**不可解构**，解构会丢 `this` 直接抛 TypeError（实测踩坑）。
    const context = await auth.$context;
    if (!context.isTrustedOrigin(candidate, { allowRelativePaths: false })) {
      return c.json({ code: 'auth.csrf_failed', message: 'cross-origin request rejected' }, 403);
    }

    await next();
  };
}
