import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { DevicePendingStore } from '../auth/device-store.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { createDeviceRoutes, REQUEST_LIMIT } from './device-routes.js';
import { requestContextMiddleware } from './request-context.js';

/**
 * T30 授权请求端点单测（无 DB——纯 store + 限流）。
 * CSRF 豁免为装配层（app.ts）语义——由 app.test 集成守护；此处断言请求可无 Origin 通过。
 */

function buildApp(): Hono {
  const store = new DevicePendingStore();
  const app = new Hono();
  app.use('*', requestContextMiddleware());
  app.route(
    '/api/auth/device',
    createDeviceRoutes({
      store,
      rateLimiter: new InMemoryRateLimiter(REQUEST_LIMIT.windowMs, REQUEST_LIMIT.max),
      publicBaseUrl: 'http://localhost:3000',
    }),
  );
  return app;
}

describe('POST /api/auth/device（T30 授权请求）', () => {
  it('无 Origin/无 session → 201 code 对（CSRF 豁免语义在装配层；此处纯路由可达）', async () => {
    const res = await buildApp().request('/api/auth/device', { method: 'POST' });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      deviceCode: string;
      userCode: string;
      verificationUri: string;
      expiresIn: number;
      interval: number;
    };
    expect(body.deviceCode).toHaveLength(43);
    expect(body.userCode).toHaveLength(8);
    expect(body.userCode).toMatch(/^[2345679ACDEFGHJKMNPQRSTUVWXYZ]+$/);
    expect(body.verificationUri).toBe('http://localhost:3000/api/auth/device/verify');
    expect(body.expiresIn).toBe(600);
    expect(body.interval).toBe(5);
  });

  it('连续请求 → 每次换新码（旧码失效：同一 device 不可复用）', async () => {
    const app = buildApp();
    const first = (await (await app.request('/api/auth/device', { method: 'POST' })).json()) as {
      deviceCode: string;
    };
    const second = (await (await app.request('/api/auth/device', { method: 'POST' })).json()) as {
      deviceCode: string;
    };
    expect(second.deviceCode).not.toBe(first.deviceCode);
  });

  it('匿名高频（>10/min 同 IP）→ 429 auth.rate_limited + retry-after', async () => {
    const app = buildApp();
    // 10 次内放行
    for (let i = 0; i < REQUEST_LIMIT.max; i += 1) {
      const res = await app.request('/api/auth/device', { method: 'POST' });
      expect(res.status).toBe(201);
    }
    const blocked = await app.request('/api/auth/device', { method: 'POST' });
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { code: string };
    expect(body.code).toBe('auth.rate_limited');
    expect(blocked.headers.get('retry-after')).toBeTruthy();
  });
});
