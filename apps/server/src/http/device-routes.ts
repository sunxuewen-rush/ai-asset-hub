import { Hono } from 'hono';
import type { DevicePendingStore } from '../auth/device-store.js';
import { AuthError } from '../auth/errors.js';
import type { RateLimiter } from '../auth/rate-limit.js';
import { generateTokenSecret, hashToken } from '../auth/tokens.js';
import type { AuditWriter } from '../audit/audit.js';
import type { Db } from '../db/client.js';
import { apiToken } from '../db/schema/index.js';
import { requireAuth } from './auth-middleware.js';

/**
 * /api/auth/device 路由组（T30-T33，RFC 8628 Device Flow · 05 §5 CLI 通道）：
 * - POST /           授权请求（CLI 匿名发起，无 session——CSRF 豁免路径）
 * - POST /approve    用户确认（登录态 cookie 通道——CSRF 保护内，T31）
 * - POST /token      CLI 轮询 → 签 API Token（匿名——CSRF 豁免路径，T32）
 * 会话模型：pending 存 DevicePendingStore（内存 TTL 10min）；确认产出平台 API Token。
 */

export interface DeviceRoutesDeps {
  db: Db;
  store: DevicePendingStore;
  rateLimiter: RateLimiter;
  /** approve 尝试限流（T33：每 user_code 5 次/分钟防爆破） */
  approveRateLimiter: RateLimiter;
  /** verificationUri 前缀（PUBLIC_BASE_URL） */
  publicBaseUrl: string;
  /** 审计写入器（T17：device.approve/token 埋点） */
  audit?: AuditWriter;
}

/** 授权请求匿名低频（按 clientIp 防 pending 耗尽——独立限流实例，阈值 10/分钟） */
export const REQUEST_LIMIT = { windowMs: 60_000, max: 10 } as const;

/** 轮询产出 token 有效期（RFC 8628 access token；1h） */
export const DEVICE_TOKEN_TTL_SEC = 3600;

/** approve 尝试限流（每 user_code 5 次/分钟） */
export const APPROVE_LIMIT = { windowMs: 60_000, max: 5 } as const;

export function createDeviceRoutes(deps: DeviceRoutesDeps): Hono {
  const { db, store, rateLimiter } = deps;
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

  // POST /api/auth/device/approve（T31：登录用户确认——cookie 通道，CSRF 保护内；
  // T33：user_code 尝试限流 5/min 前置）
  app.post('/approve', requireAuth(), async (c) => {
    const principal = c.get('principal');
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    const body = (await c.req.json().catch(() => null)) as { userCode?: unknown } | null;
    const userCode = typeof body?.userCode === 'string' ? body.userCode.trim() : '';
    if (userCode.length === 0) {
      return c.json({ code: 'request.invalid', message: 'userCode is required' }, 400);
    }
    const normalized = userCode.toUpperCase();
    const rl = deps.approveRateLimiter.hit(`device-approve:${normalized}`);
    if (!rl.allowed) {
      return c.json({ code: 'auth.rate_limited', message: 'auth.rate_limited' }, 429, {
        'retry-after': String(rl.retryAfterSec),
      });
    }
    const pending = await store.getByUser(userCode);
    // 不存在/已过期 → 404 device_code_invalid（不泄露 pending 存在性）
    if (!pending) throw new AuthError('auth.device_code_invalid');
    // 幂等：已绑定同用户 → approved；已被他人 approve（理论不可达）→ 视同无效
    const ok = await store.approve(pending.deviceCode, principal.userId);
    if (!ok) throw new AuthError('auth.device_code_invalid');
    // 审计（T17：device.approve——detail 零敏感（deviceCode 一次性码不落日志））
    await deps.audit?.({
      actorId: principal.userId,
      action: 'device.approve',
      targetType: 'device_pending',
      targetId: pending.deviceCode,
    });
    return c.json({ status: 'approved' });
  });

  // POST /api/auth/device/token（T32：CLI 轮询——pending→400 / approved→签 API Token
  // （scope=cli）/ expired→401 / unknown→404；一次性：签发后清 pending）
  app.post('/token', async (c) => {
    const body = (await c.req.json().catch(() => null)) as { deviceCode?: unknown } | null;
    const deviceCode = typeof body?.deviceCode === 'string' ? body.deviceCode.trim() : '';
    if (deviceCode.length === 0) {
      return c.json({ code: 'request.invalid', message: 'deviceCode is required' }, 400);
    }
    const raw = store.peek(deviceCode);
    if (!raw) throw new AuthError('auth.device_code_invalid'); // 错码（防探测）
    const now = Date.now();
    if (raw.expiresAt <= now) {
      await store.reject(deviceCode);
      throw new AuthError('auth.device_expired');
    }
    if (raw.userId === null) {
      // RFC 8628：未确认 → 400 authorization_pending + retry-after=interval
      return c.json(
        { code: 'auth.authorization_pending', message: 'auth.authorization_pending' },
        400,
        {
          'retry-after': '5',
        },
      );
    }
    // 已 approve：签 API Token（scope=cli，T14 签发面复用；一次性消费）
    const plain = generateTokenSecret();
    const [row] = await db
      .insert(apiToken)
      .values({
        userId: raw.userId,
        tokenHash: hashToken(plain),
        scope: 'cli',
        expiresAt: new Date(now + DEVICE_TOKEN_TTL_SEC * 1000),
      })
      .returning({ id: apiToken.id });
    await store.reject(deviceCode);
    if (!row) throw new Error('api token insert returned no row');
    // 审计（T17：device.token_issued——device flow 产 token；明文零落 detail）
    await deps.audit?.({
      actorId: raw.userId,
      action: 'device.token_issued',
      targetType: 'api_token',
      targetId: String(row.id),
      detail: { scope: 'cli' },
    });
    return c.json({
      accessToken: plain,
      tokenType: 'Bearer',
      expiresIn: DEVICE_TOKEN_TTL_SEC,
    });
  });

  return app;
}
