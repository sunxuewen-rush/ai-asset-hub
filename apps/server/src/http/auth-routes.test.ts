/**
 * `GET /api/auth/me` 薄层测试（M4c-2 **T5** · 覆盖新增只读字段 `hasLocalPassword`）。
 *
 * 覆盖：① 本地口令账号 ⇒ `hasLocalPassword === true`；② 目录账号（凭据委派行 `password = 'ldap:<工号>'`）
 * ⇒ `false`（前端据此**不显示**改密入口 · 批 design §4.5 R21）；③ 未登录 ⇒ 401；④ 既有字段形状不变。
 *
 * 断言策略（同 `admin-users.test.ts`）：PREFIX 隔离 + 回读，不用绝对总数。
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { ACCOUNT_ROLE, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import { account } from '../db/schema/index.js';
import {
  cleanupCreatedUsers,
  createTestUser,
  setUserRole,
  signInCookie,
} from '../test-utils/auth-fixture.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { createAuthRoutes } from './auth-routes.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'me-t5-';

let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let localId: string;
let localCookie: string;
let dirId: string;
let dirCookie: string;

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', officialSessionMiddleware(auth));
  app.onError((err, c) => {
    if (err instanceof AuthError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/auth', createAuthRoutes({ db }));
  return app;
}

async function getMe(cookie?: string): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = {
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
  };
  if (cookie) headers.cookie = cookie;
  const res = await buildApp().request('/api/auth/me', { method: 'GET', headers });
  return { status: res.status, json: await res.json().catch(() => null) };
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });

  localId = await createTestUser(db, {
    id: `${PREFIX}local_${randomUUID()}`,
    displayName: `${PREFIX}local`,
  });
  await setUserRole(db, localId, ACCOUNT_ROLE.USER);
  localCookie = await signInCookie(auth, localId);

  dirId = await createTestUser(db, {
    id: `${PREFIX}dir_${randomUUID()}`,
    displayName: `${PREFIX}dir`,
  });
  await setUserRole(db, dirId, ACCOUNT_ROLE.USER);
  dirCookie = await signInCookie(auth, dirId);
  // 目录账号形态：凭据委派行 password = `ldap:<工号>`（批 design §5.1）
  await db
    .update(account)
    .set({ password: `ldap:${PREFIX}10001` })
    .where(and(eq(account.providerId, 'credential'), eq(account.accountId, dirId)));
});

afterAll(async () => {
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

describe('M4c-2 T5 · GET /api/auth/me', () => {
  it('未登录 ⇒ 401 auth.session_expired', async () => {
    const { status, json } = await getMe();
    expect(status).toBe(401);
    expect((json as { code: string }).code).toBe('auth.session_expired');
  });

  it('本地口令账号 ⇒ hasLocalPassword = true（既有字段形状不变）', async () => {
    const { status, json } = await getMe(localCookie);
    expect(status).toBe(200);
    const body = json as {
      user: { id: string; displayName: string };
      role: number;
      hasLocalPassword: boolean;
    };
    expect(body.hasLocalPassword).toBe(true);
    expect(body.user.id).toBe(localId);
    expect(typeof body.role).toBe('number');
    expect(typeof body.user.displayName).toBe('string');
  });

  it('目录账号（凭据委派行 ldap: 前缀）⇒ hasLocalPassword = false', async () => {
    const { status, json } = await getMe(dirCookie);
    expect(status).toBe(200);
    expect((json as { hasLocalPassword: boolean }).hasLocalPassword).toBe(false);
  });
});
