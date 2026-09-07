import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { csrfProtection } from '../auth/csrf.js';
import { DevicePendingStore } from '../auth/device-store.js';
import { AuthError } from '../auth/errors.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import { apiToken, userAccount } from '../db/schema/index.js';
import { rbacContext } from './auth-middleware.js';
import {
  APPROVE_LIMIT,
  createDeviceRoutes,
  DEVICE_TOKEN_TTL_SEC,
  REQUEST_LIMIT,
} from './device-routes.js';
import { requestContextMiddleware } from './request-context.js';
import { tokenAuthMiddleware } from './token-middleware.js';
import { createTokenRoutes } from './tokens.js';

/**
 * T30/T31 集成测试：device 匿名端点 CSRF 豁免 + approve cookie 通道保护——
 * 装配镜像 app.ts（csrf exemptPaths 同配置）。
 */

let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let u1: string;

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

function buildApp(store?: DevicePendingStore): Hono {
  const app = new Hono();
  app.use('*', requestContextMiddleware());
  app.use('*', rbacContext(rbac));
  app.use('*', tokenAuthMiddleware(db));
  app.use('*', sessionMiddleware(sessions));
  // 镜像 app.ts：匿名 device 端点豁免；approve 保护
  app.use('*', csrfProtection({ exemptPaths: ['/api/auth/device', '/api/auth/device/token'] }));
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 404 | 409 | 429,
      );
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route(
    '/api/auth/device',
    createDeviceRoutes({
      db,
      store: store ?? new DevicePendingStore(),
      rateLimiter: new InMemoryRateLimiter(REQUEST_LIMIT.windowMs, REQUEST_LIMIT.max),
      approveRateLimiter: new InMemoryRateLimiter(APPROVE_LIMIT.windowMs, APPROVE_LIMIT.max),
      publicBaseUrl: 'http://localhost:3000',
    }),
  );
  // Bearer 验证面（T32：轮询所得 token 可走既有 token 通道）
  app.route('/api/tokens', createTokenRoutes({ db }));
  return app;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  u1 = await makeUser('dev-u1');
});

afterAll(async () => {
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'dev-%'));
  for (const u of users) {
    await db.delete(apiToken).where(eq(apiToken.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'device-test');
  return `aih_session=${sid}`;
}

describe('POST /api/auth/device（T30 授权请求）', () => {
  it('无 Origin/无 session → 201 code 对（匿名端点 CSRF 豁免）', async () => {
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
    expect(body.verificationUri).toBe('http://localhost:3000/api/auth/device/verify');
    expect(body.expiresIn).toBe(600);
    expect(body.interval).toBe(5);
  });

  it('连续请求换新码；匿名高频 → 429 + retry-after', async () => {
    const app = buildApp();
    const first = (await (await app.request('/api/auth/device', { method: 'POST' })).json()) as {
      deviceCode: string;
    };
    const second = (await (await app.request('/api/auth/device', { method: 'POST' })).json()) as {
      deviceCode: string;
    };
    expect(second.deviceCode).not.toBe(first.deviceCode);
    for (let i = 0; i < REQUEST_LIMIT.max - 2; i += 1) {
      const res = await app.request('/api/auth/device', { method: 'POST' });
      expect(res.status).toBe(201);
    }
    const blocked = await app.request('/api/auth/device', { method: 'POST' });
    expect(blocked.status).toBe(429);
  });
});

describe('POST /api/auth/device/approve（T31 用户确认）', () => {
  it('登录用户 approve → 200 {status: approved}；重复 approve 幂等', async () => {
    const app = buildApp();
    const auth = (await (await app.request('/api/auth/device', { method: 'POST' })).json()) as {
      deviceCode: string;
      userCode: string;
    };
    const cookie = await cookieFor(u1);
    const headers = { cookie, origin: 'http://localhost:3000', host: 'localhost:3000' };
    const res = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ userCode: auth.userCode }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('approved');
    // 幂等：同用户重复 approve → 200
    const again = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ userCode: auth.userCode }),
    });
    expect(again.status).toBe(200);
  });

  it('未登录 approve → 401', async () => {
    const app = buildApp();
    const auth = (await (await app.request('/api/auth/device', { method: 'POST' })).json()) as {
      userCode: string;
    };
    const res = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userCode: auth.userCode }),
    });
    expect(res.status).toBe(401);
  });

  it('错码 → 404 auth.device_code_invalid；无 Origin（cookie 通道）→ 403 csrf', async () => {
    const app = buildApp();
    const cookie = await cookieFor(u1);
    const badCode = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: {
        cookie,
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userCode: 'ZZZZZZZZ' }),
    });
    expect(badCode.status).toBe(404);
    const body = (await badCode.json()) as { code: string };
    expect(body.code).toBe('auth.device_code_invalid');
    // approve 不在豁免列表：无 Origin POST → 403（cookie 通道 CSRF 面生效）
    const noOrigin = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ userCode: 'ZZZZZZZZ' }),
    });
    expect(noOrigin.status).toBe(403);
  });

  it('T33：同 user_code 错码连续 5 次（第 6 次）→ 429 auth.rate_limited', async () => {
    const app = buildApp();
    const cookie = await cookieFor(u1);
    const headers = {
      cookie,
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      'content-type': 'application/json',
    };
    for (let i = 0; i < APPROVE_LIMIT.max; i += 1) {
      const res = await app.request('/api/auth/device/approve', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userCode: 'AAAAAAAA' }),
      });
      expect(res.status).toBe(404);
    }
    const blocked = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userCode: 'AAAAAAAA' }),
    });
    expect(blocked.status).toBe(429);
    expect(((await blocked.json()) as { code: string }).code).toBe('auth.rate_limited');
    expect(blocked.headers.get('retry-after')).toBeTruthy();
  });

  it('T33：userCode 大小写不敏感（小写输入 approve 成功）', async () => {
    const app = buildApp();
    const cookie = await cookieFor(u1);
    const auth = (await (await app.request('/api/auth/device', { method: 'POST' })).json()) as {
      deviceCode: string;
      userCode: string;
    };
    const res = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: {
        cookie,
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userCode: auth.userCode.toLowerCase() }),
    });
    expect(res.status).toBe(200);
    // 绑定生效：轮询可取 token
    const token = await app.request('/api/auth/device/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceCode: auth.deviceCode }),
    });
    expect(token.status).toBe(200);
  });
});

describe('POST /api/auth/device/token（T32 CLI 轮询签发）', () => {
  /** 请求授权 → 返回 {deviceCode,userCode} */
  async function requestCodes(app: Hono): Promise<{ deviceCode: string; userCode: string }> {
    return (await (await app.request('/api/auth/device', { method: 'POST' })).json()) as {
      deviceCode: string;
      userCode: string;
    };
  }

  async function approve(app: Hono, userCode: string, cookie: string) {
    const res = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: {
        cookie,
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userCode }),
    });
    expect(res.status).toBe(200);
  }

  it('未 approve → 400 authorization_pending + retry-after', async () => {
    const app = buildApp();
    const { deviceCode } = await requestCodes(app);
    const res = await app.request('/api/auth/device/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceCode }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('auth.authorization_pending');
    expect(res.headers.get('retry-after')).toBe('5');
  });

  it('approve 后轮询 → token 可 Bearer 调 /api/tokens（200 本人列表）', async () => {
    const app = buildApp();
    const cookie = await cookieFor(u1);
    const { deviceCode, userCode } = await requestCodes(app);
    await approve(app, userCode, cookie);
    const res = await app.request('/api/auth/device/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceCode }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      accessToken: string;
      tokenType: string;
      expiresIn: number;
    };
    expect(body.accessToken.startsWith('aih_')).toBe(true);
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBe(DEVICE_TOKEN_TTL_SEC);
    // token 落库 scope=cli 且属 approve 用户
    const me = await app.request('/api/tokens', {
      headers: { authorization: `Bearer ${body.accessToken}` },
    });
    expect(me.status).toBe(200);
    // 一次性：再轮询同 deviceCode → 404（已消费）
    const again = await app.request('/api/auth/device/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceCode }),
    });
    expect(again.status).toBe(404);
  });

  it('过期 pending → 401 auth.device_expired；错码 → 404', async () => {
    const app = buildApp();
    const store = new DevicePendingStore();
    const p = await store.create();
    // 变异引用模拟过期（对象存于 Map，直接推进时间戳）
    p.expiresAt = Date.now() - 1;
    const app2 = buildApp(store);
    const expired = await app2.request('/api/auth/device/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceCode: p.deviceCode }),
    });
    expect(expired.status).toBe(401);
    expect(((await expired.json()) as { code: string }).code).toBe('auth.device_expired');
    // 错码
    const bad = await app.request('/api/auth/device/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deviceCode: 'no-such-device-code' }),
    });
    expect(bad.status).toBe(404);
  });
});
