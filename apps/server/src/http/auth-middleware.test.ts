import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { AuthError } from '../auth/errors.js';
import { ACCOUNT_ROLE, type AccountRole, RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import { userAccount } from '../db/schema/index.js';
import { rbacContext, requireAuth, requireRole } from './auth-middleware.js';

/**
 * 鉴权/授权中间件测试（M4-pre：判定链为 4 档层级 `role >= minRole`，design §2.2）。
 * 覆盖：requireAuth 门 + requireRole 四档层级负例（未登录 401 / 用户 403 / 管理 200 / 超管 200）。
 */

let db: Db;
let rbac: RbacService;
let sessions: SessionManager;

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

async function setRole(userId: string, role: AccountRole): Promise<void> {
  await db.update(userAccount).set({ role }).where(eq(userAccount.id, userId));
}

/** 造登录态：session manager 直签 → cookie 头 */
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'mw-test');
  return `aih_session=${sid}`;
}

/** 测试 app：session 中间件 + rbac 注入 + 三档探针端点 */
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  // onError：AuthError 结构化（与 createApp 同款）
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 409 | 429,
      );
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.get('/probe-auth', requireAuth(), (c) => c.json({ ok: true }));
  app.get('/probe-user', requireRole(ACCOUNT_ROLE.USER), (c) => c.json({ ok: true }));
  app.get('/probe-admin', requireRole(ACCOUNT_ROLE.ADMIN), (c) => c.json({ ok: true }));
  app.get('/probe-super', requireRole(ACCOUNT_ROLE.SUPER_ADMIN), (c) => c.json({ ok: true }));
  return app;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
});

afterAll(async () => {
  // 精确清理自己创建的测试用户（displayName 前缀）
  const mine = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'mw-%'));
  for (const u of mine) {
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

describe('auth middleware（M4-pre 4 档层级判定）', () => {
  it('requireAuth: no cookie → 401 session_expired', async () => {
    const res = await buildApp().request('/probe-auth');
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'auth.session_expired' });
  });

  it('requireAuth: valid session → 200', async () => {
    const uid = await makeUser('mw-plain');
    const res = await buildApp().request('/probe-auth', {
      headers: { cookie: await cookieFor(uid) },
    });
    expect(res.status).toBe(200);
  });

  it('requireRole(ADMIN): 未登录 → 401；普通用户（role=USER）→ 403', async () => {
    const app = buildApp();
    expect((await app.request('/probe-admin')).status).toBe(401);
    const plain = await makeUser('mw-plain-admin');
    const res = await app.request('/probe-admin', {
      headers: { cookie: await cookieFor(plain) },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.forbidden' });
  });

  it('requireRole 层级负例：USER 档 → user 门 200 / admin 门 403', async () => {
    const uid = await makeUser('mw-user'); // 默认 role = USER(1)
    const app = buildApp();
    const cookie = await cookieFor(uid);
    expect((await app.request('/probe-user', { headers: { cookie } })).status).toBe(200);
    expect((await app.request('/probe-admin', { headers: { cookie } })).status).toBe(403);
  });

  it('requireRole 层级负例：ADMIN 档 → admin 门 200 / super 门 403', async () => {
    const uid = await makeUser('mw-admin');
    await setRole(uid, ACCOUNT_ROLE.ADMIN);
    const app = buildApp();
    const cookie = await cookieFor(uid);
    expect((await app.request('/probe-admin', { headers: { cookie } })).status).toBe(200);
    expect((await app.request('/probe-super', { headers: { cookie } })).status).toBe(403);
  });

  it('SUPER_ADMIN 档：全场放行（层级天然覆盖，无短路分支）', async () => {
    const uid = await makeUser('mw-super');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    const app = buildApp();
    const cookie = await cookieFor(uid);
    for (const probe of ['/probe-user', '/probe-admin', '/probe-super']) {
      expect((await app.request(probe, { headers: { cookie } })).status).toBe(200);
    }
  });

  it('DISABLED user rejected at auth gate even with valid session', async () => {
    const uid = await makeUser('mw-disabled');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, uid));
    const res = await buildApp().request('/probe-auth', {
      headers: { cookie: await cookieFor(uid) },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'auth.session_expired' });
  });

  it('DISABLED 用户即便持超管 role，管理门亦拒（roleOf 非 ACTIVE → null）', async () => {
    const uid = await makeUser('mw-disabled-admin');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, uid));
    const res = await buildApp().request('/probe-admin', {
      headers: { cookie: await cookieFor(uid) },
    });
    expect(res.status).toBe(401);
  });
});
