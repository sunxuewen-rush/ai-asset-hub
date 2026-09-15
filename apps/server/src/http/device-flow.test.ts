import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Hono } from 'hono';
import { cleanupCreatedUsers, createTestUser, signInCookie } from '../test-utils/auth-fixture.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { type AppDeps, createApp } from '../app.js';
import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { createClient, type Db } from '../db/client.js';
import { auditLog, deviceCode } from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';

/**
 * 设备流集成测试（M4b-pre T5：**官方四端点契约**，design R8 · §8）。
 *
 * 契约要点（源码实录：`better-auth/dist/plugins/device-authorization/routes.mjs`）：
 * - `POST /api/auth/device/code` `{client_id}`（**必填**）→ 200 `{device_code, user_code,
 *   verification_uri, verification_uri_complete, expires_in, interval}`（snake_case）
 * - `GET /api/auth/device?user_code=` 认领（带会话）→ 200 `{user_code, status, client_id, scope}`
 * - `POST /api/auth/device/approve` `{userCode}` → 200 `{success:true}`（**须先认领**，否则 400 `DEVICE_CODE_NOT_CLAIMED`）
 * - `POST /api/auth/device/deny` `{userCode}` → 200 `{success:true}`
 * - `POST /api/auth/device/token` `{device_code}` → 200 `{access_token, token_type:'Bearer', expires_in, scope}`
 *   错误一律 **400** + OAuth 风格体 `{error, error_description}`：
 *   `authorization_pending` / `slow_down` / `expired_token` / `access_denied` / `invalid_grant`
 * - 设备令牌 = **官方会话 token**（Bearer 由 `bearer` 插件还原为会话）⇒ 可直接访问受保护业务端点
 *
 * 测试专用 DB 调整（官方下限所致，均注明）：`polling_interval` 内轮询会被判 `slow_down`、
 * 过期造数只能改了 `expires_at`——两处都直接改 `device_code` 行（不改产品代码）。
 */

let db: Db;
let auth: AihAuth;
const PREFIX = 'devit-';

function makeApp(overrides?: Partial<AppDeps>): Hono {
  return createApp({
    db,
    audit: createAuditWriter(db),
    rateLimiter: new InMemoryRateLimiter(60_000, 100),
    ldap: null,
    storage: createLocalStorage('./storage-test'),
    cookieSecure: false,
    auth,
    ...overrides,
  });
}

const ORIGIN = { origin: 'http://localhost:3000', host: 'localhost:3000' };

/** 本轮创建的设备码（清理用；已消费的行通常已被官方删除） */
const issuedDeviceCodes: string[] = [];

async function requestCode(app: Hono, clientId = 'aih-cli') {
  const res = await app.request('/api/auth/device/code', {
    method: 'POST',
    headers: { ...ORIGIN, 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: clientId }),
  });
  if (res.status === 200) {
    const body = (await res.clone().json()) as { device_code: string };
    issuedDeviceCodes.push(body.device_code);
  }
  return res;
}

/** RFC 8628 轮询请求（官方强制三字段：`grant_type` 字面量 + `device_code` + `client_id`） */
function pollToken(app: Hono, deviceCodeValue: string, clientId = 'aih-cli') {
  return app.request('/api/auth/device/token', {
    method: 'POST',
    headers: { ...ORIGIN, 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCodeValue,
      client_id: clientId,
    }),
  });
}

/** 直接改库把上次轮询时间前移（绕开 5s interval ⇒ 免 sleep；测试专用） */
async function rewindPolling(deviceCodeValue: string): Promise<void> {
  await db
    .update(deviceCode)
    .set({ lastPolledAt: new Date(Date.now() - 60_000) })
    .where(eq(deviceCode.deviceCode, deviceCodeValue));
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  auth = createAuth({ ldap: null });
});

afterAll(async () => {
  await db.delete(deviceCode).where(inArray(deviceCode.deviceCode, issuedDeviceCodes));
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

describe('设备流（官方四端点契约）', () => {
  it('POST /device/code：client_id 必填；返回 snake_case 全字段', async () => {
    const app = makeApp();
    const missing = await app.request('/api/auth/device/code', {
      method: 'POST',
      headers: { ...ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({ error: 'invalid_request' });

    const res = await requestCode(app);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      'device_code',
      'expires_in',
      'interval',
      'user_code',
      'verification_uri',
      'verification_uri_complete',
    ]);
    expect(body.expires_in).toBe(1800); // 30m（显式钉定）
    expect(body.interval).toBe(5);
    expect(String(body.verification_uri)).toContain('/device');
    expect(String(body.verification_uri_complete)).toContain(`user_code=${body.user_code}`);
  });

  it('未认领直接 approve → 400（DEVICE_CODE_NOT_CLAIMED，不泄露码状态）', async () => {
    const app = makeApp();
    const code = (await (await requestCode(app)).json()) as { user_code: string };
    const id = await createTestUser(db, { id: `${PREFIX}claim`, displayName: `${PREFIX}claim` });
    const cookie = await signInCookie(auth, id);
    const res = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: { ...ORIGIN, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ userCode: code.user_code }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_request' });
  });

  it('两段式闭环：认领 → approve → 令牌签发（Bearer 可访问受保护端点）', async () => {
    const app = makeApp();
    const user = await createTestUser(db, { id: `${PREFIX}full`, displayName: `${PREFIX}full` });
    const cookie = await signInCookie(auth, user);
    const code = (await (await requestCode(app)).json()) as {
      device_code: string;
      user_code: string;
    };

    // ① 认领（GET /device?user_code=）
    const claim = await app.request(`/api/auth/device?user_code=${code.user_code}`, {
      headers: { ...ORIGIN, cookie },
    });
    expect(claim.status).toBe(200);
    expect(await claim.json()).toMatchObject({
      user_code: code.user_code,
      status: 'pending',
      client_id: 'aih-cli',
    });

    // ② 未批准轮询 → 400 authorization_pending；紧随其后 → 400 slow_down（同窗口内过快轮询）
    const pending = await pollToken(app, code.device_code);
    expect(pending.status).toBe(400);
    expect(await pending.json()).toMatchObject({ error: 'authorization_pending' });

    const tooFast = await pollToken(app, code.device_code);
    expect(tooFast.status).toBe(400);
    expect(await tooFast.json()).toMatchObject({ error: 'slow_down' });

    // ③ approve（登录态 cookie 通道）
    const approve = await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: { ...ORIGIN, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ userCode: code.user_code }),
    });
    expect(approve.status).toBe(200);
    expect(await approve.json()).toMatchObject({ success: true });

    // ④ 轮询取令牌（把上次轮询时间前移绕开 interval；测试专用）
    await rewindPolling(code.device_code);
    const token = await pollToken(app, code.device_code);
    expect(token.status).toBe(200);
    const issued = (await token.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
      scope: string;
    };
    expect(issued.token_type).toBe('Bearer');
    expect(issued.access_token.length).toBeGreaterThan(20);
    expect(issued.scope).toBe('');

    // ⑤ 设备令牌可访问受保护端点（bearer 插件 → 会话；业务面 + /me 双验）
    const me = await app.request('/api/auth/me', {
      headers: { ...ORIGIN, authorization: `Bearer ${issued.access_token}` },
    });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { user: { id: string } }).user.id).toBe(user);

    const tokens = await app.request('/api/tokens', {
      headers: { ...ORIGIN, authorization: `Bearer ${issued.access_token}` },
    });
    expect(tokens.status).toBe(200);

    // ⑥ 审计：批准 + 令牌签发（actor 归属正确；明文不落审计）
    const rows = await db
      .select({ action: auditLog.action, detail: auditLog.detail })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.actorId, user),
          inArray(auditLog.action, ['device.approve', 'device.token_issued']),
        ),
      );
    expect(rows.map((r) => r.action).sort()).toEqual(['device.approve', 'device.token_issued']);
    expect(JSON.stringify(rows)).not.toContain(issued.access_token);
  });

  it('Bearer 通道不带 cookie：他人 cookie 在场也不串号（防凭证混淆）', async () => {
    const app = makeApp();
    const owner = await createTestUser(db, { id: `${PREFIX}owner`, displayName: `${PREFIX}owner` });
    const other = await createTestUser(db, { id: `${PREFIX}other`, displayName: `${PREFIX}other` });
    const otherCookie = await signInCookie(auth, other);

    const code = (await (await requestCode(app)).json()) as {
      device_code: string;
      user_code: string;
    };
    await app.request(`/api/auth/device?user_code=${code.user_code}`, {
      headers: { ...ORIGIN, cookie: await signInCookie(auth, owner) },
    });
    await app.request('/api/auth/device/approve', {
      method: 'POST',
      headers: {
        ...ORIGIN,
        cookie: await signInCookie(auth, owner),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userCode: code.user_code }),
    });
    await rewindPolling(code.device_code);
    const token = (await (await pollToken(app, code.device_code)).json()) as {
      access_token: string;
    };

    // 带上「另一个用户」的 cookie + 设备令牌 Bearer ⇒ 必须解析为令牌归属者
    const me = await app.request('/api/auth/me', {
      headers: { ...ORIGIN, cookie: otherCookie, authorization: `Bearer ${token.access_token}` },
    });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { user: { id: string } }).user.id).toBe(owner);
  });

  it('deny → 200；随后轮询 → 400 access_denied（审计 device.deny）', async () => {
    const app = makeApp();
    const user = await createTestUser(db, { id: `${PREFIX}deny`, displayName: `${PREFIX}deny` });
    const cookie = await signInCookie(auth, user);
    const code = (await (await requestCode(app)).json()) as {
      device_code: string;
      user_code: string;
    };
    await app.request(`/api/auth/device?user_code=${code.user_code}`, {
      headers: { ...ORIGIN, cookie },
    });
    const deny = await app.request('/api/auth/device/deny', {
      method: 'POST',
      headers: { ...ORIGIN, cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ userCode: code.user_code }),
    });
    expect(deny.status).toBe(200);
    expect(await deny.json()).toMatchObject({ success: true });

    await rewindPolling(code.device_code);
    const poll = await pollToken(app, code.device_code);
    expect(poll.status).toBe(400);
    expect(await poll.json()).toMatchObject({ error: 'access_denied' });

    const rows = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(and(eq(auditLog.actorId, user), eq(auditLog.action, 'device.deny')));
    expect(rows).toHaveLength(1);
  });

  it('边界：错 device_code → 400 invalid_grant；错 user_code 认领 → 400 invalid_request；过期 → expired_token 且清行', async () => {
    const app = makeApp();
    const unknownDevice = await pollToken(app, 'nope-does-not-exist');
    expect(unknownDevice.status).toBe(400);
    expect(await unknownDevice.json()).toMatchObject({ error: 'invalid_grant' });

    // RFC 8628 三字段强制（缺 grant_type/client_id → 官方校验 400）
    const incomplete = await app.request('/api/auth/device/token', {
      method: 'POST',
      headers: { ...ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({ device_code: 'whatever' }),
    });
    expect(incomplete.status).toBe(400);
    expect(await incomplete.json()).toMatchObject({ code: 'VALIDATION_ERROR' });

    const unknownUser = await app.request('/api/auth/device?user_code=ZZZZZZZZ', {
      headers: ORIGIN,
    });
    expect(unknownUser.status).toBe(400);
    expect(await unknownUser.json()).toMatchObject({ error: 'invalid_request' });

    // 过期：改库把 expires_at 前移（官方无「短 TTL 造数」入口）
    const code = (await (await requestCode(app)).json()) as {
      device_code: string;
      user_code: string;
    };
    await db
      .update(deviceCode)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(deviceCode.deviceCode, code.device_code));
    const expired = await pollToken(app, code.device_code);
    expect(expired.status).toBe(400);
    expect(await expired.json()).toMatchObject({ error: 'expired_token' });
    const rows = await db
      .select({ id: deviceCode.id })
      .from(deviceCode)
      .where(eq(deviceCode.deviceCode, code.device_code));
    expect(rows).toHaveLength(0); // 官方行为：过期即清行

    // 过期 user_code 认领 → 400 expired_token（身份不同的错误面）
    const code2 = (await (await requestCode(app)).json()) as {
      device_code: string;
      user_code: string;
    };
    await db
      .update(deviceCode)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(deviceCode.deviceCode, code2.device_code));
    const claimExpired = await app.request(`/api/auth/device?user_code=${code2.user_code}`, {
      headers: ORIGIN,
    });
    expect(claimExpired.status).toBe(400);
    expect(await claimExpired.json()).toMatchObject({ error: 'expired_token' });
  });

  it('旧自研契约已下线（grep 断言之外的端点级反证：自研 201/camelCase 形态不再存在）', async () => {
    const app = makeApp();
    const legacy = await app.request('/api/auth/device', {
      method: 'POST',
      headers: { ...ORIGIN, 'content-type': 'application/json' },
      body: '{}',
    });
    // 旧实现：POST /api/auth/device → 201 + `{deviceCode,userCode,verificationUri,…}`（camelCase）
    // 新契约：该路径只服务 GET（认领）⇒ POST 不再产出 201/camelCase
    expect(legacy.status).not.toBe(201);
    const body = await legacy.text();
    expect(body).not.toContain('deviceCode');
    expect(body).not.toContain('verificationUri');
  });
});
