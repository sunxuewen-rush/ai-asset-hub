import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Hono } from 'hono';
import {
  cleanupCreatedUsers,
  countSessions,
  createTestUser,
  TEST_PASSWORD,
} from '../test-utils/auth-fixture.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createApp } from '../app.js';
import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { createClient, type Db } from '../db/client.js';
import { session } from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';

/**
 * 会话生命周期测试（M4b-pre plan T6 · design §6 新增测试面 ②「会话落库 + 进程重启存活」延伸）。
 *
 * 钉定 design §2.2/§5（R6）的会话语义与 08 §6 的落库字段：
 * - 会话**落库**（`session` 表）· cookie 名 `better-auth.session_token` + `HttpOnly`/`SameSite=Lax`
 * - `expiresIn = SESSION_TTL_HOURS`（8h）且 **`disableSessionRefresh`** ⇒ 绝对过期（后续请求不续期）
 * - `ip_address` / `user_agent` 落库（08 §6 网络字段；官方 adapter 从端点上下文读取）
 * - 登出删行 · 篡改/删行/过期 ⇒ 401（过期行被官方清理）· 多端登录互不影响
 */

let db: Db;
let auth: AihAuth;
const PREFIX = 'sess-';

function makeApp(): Hono {
  return createApp({
    db,
    audit: createAuditWriter(db),
    rateLimiter: new InMemoryRateLimiter(60_000, 100),
    ldap: null,
    storage: createLocalStorage('./storage-test'),
    cookieSecure: false,
    auth,
  });
}

const ORIGIN = { origin: 'http://localhost:3000', host: 'localhost:3000' };

async function makeUser(tag: string): Promise<string> {
  return createTestUser(db, { id: `${PREFIX}${tag}`, displayName: `${PREFIX}${tag}` });
}

/** 登录（自绘端点）并返回原始 Set-Cookie 串（含属性，供属性断言） */
async function signInRaw(userId: string): Promise<string> {
  const res = await makeApp().request('/api/auth/sign-in/aih', {
    method: 'POST',
    headers: { ...ORIGIN, 'content-type': 'application/json', 'user-agent': 'sess-test-agent' },
    body: JSON.stringify({ username: userId, password: TEST_PASSWORD }),
  });
  expect(res.status).toBe(200);
  const entry = res.headers.getSetCookie().find((v) => v.startsWith('better-auth.session_token='));
  expect(entry, 'session cookie present').toBeDefined();
  return entry!;
}

function cookieOf(setCookie: string): string {
  return setCookie.split(';')[0]!;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  auth = createAuth({ ldap: null });
});

afterAll(async () => {
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

describe('会话落库与 cookie 契约（design §2.2 · §5 R6）', () => {
  it('登录 → `session` 表新增行 + cookie 名/属性正确（HttpOnly · SameSite=Lax · Path=/）', async () => {
    const uid = await makeUser('cookie');
    const setCookie = await signInRaw(uid);
    expect(setCookie.startsWith('better-auth.session_token=')).toBe(true);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(await countSessions(db, uid)).toBe(1);
  });

  it('会话有效期 = SESSION_TTL_HOURS（8h），且为**绝对过期**（后续请求不续期）', async () => {
    const uid = await makeUser('ttl');
    const cookie = cookieOf(await signInRaw(uid));
    const [row] = await db.select().from(session).where(eq(session.userId, uid));
    const ttlMs = row!.expiresAt.getTime() - row!.createdAt.getTime();
    expect(Math.abs(ttlMs - 8 * 3600 * 1000)).toBeLessThan(60_000);

    const before = row!.expiresAt.getTime();
    const me1 = await makeApp().request('/api/auth/me', { headers: { ...ORIGIN, cookie } });
    expect(me1.status).toBe(200);
    const me2 = await makeApp().request('/api/auth/me', { headers: { ...ORIGIN, cookie } });
    expect(me2.status).toBe(200);
    const [after] = await db.select().from(session).where(eq(session.userId, uid));
    expect(after!.expiresAt.getTime()).toBe(before); // disableSessionRefresh：不滑动
  });

  it('会话记录网络字段（08 §6）：ip_address / user_agent 落库', async () => {
    const uid = await makeUser('netfields');
    await signInRaw(uid);
    const [row] = await db.select().from(session).where(eq(session.userId, uid));
    expect(row!.userAgent).toBe('sess-test-agent');
    expect(typeof row!.ipAddress).toBe('string');
  });

  it('同用户多次登录 → 多行会话且 token 互异（多端并存，互不失效）', async () => {
    const uid = await makeUser('multi');
    const c1 = cookieOf(await signInRaw(uid));
    const c2 = cookieOf(await signInRaw(uid));
    expect(c1).not.toBe(c2);
    expect(await countSessions(db, uid)).toBe(2);
    const app = makeApp();
    for (const cookie of [c1, c2]) {
      const res = await app.request('/api/auth/me', { headers: { ...ORIGIN, cookie } });
      expect(res.status).toBe(200);
      expect(((await res.json()) as { user: { id: string } }).user.id).toBe(uid);
    }
  });

  it('登出（官方 sign-out）→ 会话行删除，此后同 cookie 401', async () => {
    const uid = await makeUser('logout');
    const cookie = cookieOf(await signInRaw(uid));
    const app = makeApp();
    const out = await app.request('/api/auth/sign-out', {
      method: 'POST',
      headers: { ...ORIGIN, cookie, 'content-type': 'application/json' },
      body: '{}',
    });
    expect(out.status).toBe(200);
    expect(await countSessions(db, uid)).toBe(0);
    const me = await app.request('/api/auth/me', { headers: { ...ORIGIN, cookie } });
    expect(me.status).toBe(401);
  });

  it('cookie 签名被篡改 → /me 401（不接受伪造会话）', async () => {
    const uid = await makeUser('tamper');
    const cookie = cookieOf(await signInRaw(uid));
    const [name, value] = cookie.split('=');
    const flipped = `${name}=${value!.slice(0, -2)}${value!.slice(-2) === 'aa' ? 'bb' : 'aa'}`;
    const res = await makeApp().request('/api/auth/me', {
      headers: { ...ORIGIN, cookie: flipped },
    });
    expect(res.status).toBe(401);
  });

  it('会话行被删除（等价服务端强制下线）→ 同 cookie 401', async () => {
    const uid = await makeUser('revoked');
    const cookie = cookieOf(await signInRaw(uid));
    await db.delete(session).where(eq(session.userId, uid));
    const res = await makeApp().request('/api/auth/me', { headers: { ...ORIGIN, cookie } });
    expect(res.status).toBe(401);
  });

  it('过期会话 → 401 且官方清理该行（落库形态可审计）', async () => {
    const uid = await makeUser('expired');
    const cookie = cookieOf(await signInRaw(uid));
    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(session.userId, uid));
    const res = await makeApp().request('/api/auth/me', { headers: { ...ORIGIN, cookie } });
    expect(res.status).toBe(401);
    expect(await countSessions(db, uid)).toBe(0);
  });

  it('未登录 → /me 401（匿名不泄露）', async () => {
    const res = await makeApp().request('/api/auth/me', { headers: ORIGIN });
    expect(res.status).toBe(401);
  });

  it('账号非 ACTIVE（DISABLED/PENDING）→ 已签发会话不再可用（05 §4.1 状态门）', async () => {
    const uid = await createTestUser(db, {
      id: `${PREFIX}disabled`,
      displayName: `${PREFIX}disabled`,
    });
    const cookie = cookieOf(await signInRaw(uid));
    const { user } = await import('../db/schema/index.js');
    await db.update(user).set({ status: 'DISABLED' }).where(eq(user.id, uid));
    const res = await makeApp().request('/api/auth/me', { headers: { ...ORIGIN, cookie } });
    expect(res.status).toBe(401);
  });

  it('会话行归属唯一：不存在跨用户串号（同一 cookie 只映射本人）', async () => {
    const a = await makeUser('iso-a');
    const b = await makeUser('iso-b');
    const cookieA = cookieOf(await signInRaw(a));
    await signInRaw(b);
    const res = await makeApp().request('/api/auth/me', {
      headers: { ...ORIGIN, cookie: cookieA },
    });
    expect(((await res.json()) as { user: { id: string } }).user.id).toBe(a);
    const rows = await db
      .select({ userId: session.userId })
      .from(session)
      .where(inArray(session.userId, [a, b]));
    expect(rows.filter((r) => r.userId === a)).toHaveLength(1);
  });

  it('会话 id 唯一约束：批量登录产生互异 id/token（防碰撞回归）', async () => {
    const uid = await makeUser('unique');
    await signInRaw(uid);
    await signInRaw(uid);
    const rows = await db
      .select({ id: session.id, token: session.token })
      .from(session)
      .where(eq(session.userId, uid));
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(new Set(rows.map((r) => r.token)).size).toBe(rows.length);
  });
});
