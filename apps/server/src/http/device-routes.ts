import { Hono } from 'hono';
import type { DevicePendingStore } from '../auth/device-store.js';
import { AuthError } from '../auth/errors.js';
import type { RateLimiter } from '../auth/rate-limit.js';
import { requireAuth } from './auth-middleware.js';

/**
 * /api/auth/device 路由组（T30-T33，RFC 8628 Device Flow · 05 §5 CLI 通道）：
 * - POST /           授权请求（CLI 匿名发起，无 session——CSRF 豁免路径）
 * - POST /approve    用户确认（登录态 cookie 通道——CSRF 保护内，T31）
 * - POST /token      CLI 轮询 → 签 API Token（匿名——CSRF 豁免路径，T32）
 * 会话模型：pending 存 DevicePendingStore（内存 TTL 10min）；确认产出平台 API Token。
 */

export interface DeviceRoutesDeps {
  store: DevicePendingStore;
  rateLimiter: RateLimiter;
  /** verificationUri 前缀（PUBLIC_BASE_URL） */
  publicBaseUrl: string;
}

/** 授权请求匿名低频（按 clientIp 防 pending 耗尽——独立限流实例，阈值 10/分钟） */
export const REQUEST_LIMIT = { windowMs: 60_000, max: 10 } as const;

export function createDeviceRoutes(deps: DeviceRoutesDeps): Hono {
  const { store, rateLimiter } = deps;
  const base = deps.publicBaseUrl.replace(/\/$/, '');
  const app = new Hono();

  // POST /api/auth/device（T30：CLI 授权请求——无 session 要求，返回 code 对）
  app.post('/', async (c) => {
    const ctx = c.get('requestContext');
    const rl = rateLimiter.hit(`device-request:${ctx.clientIp}`);
    if (!rl.allowed) {
      return c.json({ code: 'auth.rate_limited', message: 'auth.rate_limited' }, 429, {
        'retry-after': String(rl.retryAfterSec),
      });
    }
    const pending = await store.create();
    return c.json(
      {
        deviceCode: pending.deviceCode,
        userCode: pending.userCode,
        verificationUri: `${base}/api/auth/device/verify`,
        expiresIn: Math.floor((pending.expiresAt - pending.createdAt) / 1000),
        interval: 5,
      },
      201,
    );
  });

  // POST /api/auth/device/approve（T31：登录用户确认——cookie 通道，CSRF 保护内）
  app.post('/approve', requireAuth(), async (c) => {
    const principal = c.get('principal');
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    const body = (await c.req.json().catch(() => null)) as { userCode?: unknown } | null;
    const userCode = typeof body?.userCode === 'string' ? body.userCode.trim() : '';
    if (userCode.length === 0) {
      return c.json({ code: 'request.invalid', message: 'userCode is required' }, 400);
    }
    const pending = await store.getByUser(userCode);
    // 不存在/已过期 → 404 device_code_invalid（不泄露 pending 存在性）
    if (!pending) throw new AuthError('auth.device_code_invalid');
    // 幂等：已绑定同用户 → approved；已被他人 approve（理论不可达）→ 视同无效
    const ok = await store.approve(pending.deviceCode, principal.userId);
    if (!ok) throw new AuthError('auth.device_code_invalid');
    return c.json({ status: 'approved' });
  });

  return app;
}
