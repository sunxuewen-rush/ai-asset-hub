import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';
import {
  cleanupCreatedUsers,
  createTestUser,
  setUserRole,
  signInCookie,
} from '../test-utils/auth-fixture.js';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { ACCOUNT_ROLE, type AccountRole, RbacService } from '../auth/rbac.js';
import { hashToken } from '../auth/tokens.js';
import { createClient, type Db } from '../db/client.js';
import { apiToken, auditLog, user } from '../db/schema/index.js';
import { createAuditRoutes } from './audit.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { tokenAuthMiddleware } from './token-middleware.js';
import { createTokenRoutes } from './tokens.js';

let db: Db;
let auth: AihAuth;
let rbac: RbacService;

async function makeUser(
  displayName: string,
  status: 'ACTIVE' | 'DISABLED' = 'ACTIVE',
): Promise<string> {
  return createTestUser(db, { id: `usr_${randomUUID()}`, displayName, status });
}

async function setRole(userId: string, role: AccountRole): Promise<void> {
  await setUserRole(db, userId, role);
}

async function mintToken(
  userId: string,
  opts: { expiresAt?: Date | null; revoked?: boolean } = {},
): Promise<{ id: number; plain: string }> {
  const plain = `aih_${randomUUID()}${randomUUID()}`.slice(0, 47);
  const [row] = await db
    .insert(apiToken)
    .values({
      userId,
      tokenHash: hashToken(plain),
      scope: '',
      expiresAt: opts.expiresAt ?? null,
      revokedAt: opts.revoked ? new Date() : null,
    })
    .returning({ id: apiToken.id });
  return { id: row!.id, plain };
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', tokenAuthMiddleware(db));
  app.use('*', officialSessionMiddleware(auth));
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 409 | 429,
      );
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/tokens', createTokenRoutes({ db }));
  app.route('/api/audit', createAuditRoutes({ db }));
  return app;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });
});

afterAll(async () => {
  const users = await db.select({ id: user.id }).from(user).where(like(user.name, 'bearer-%'));
  for (const u of users) {
    await db.delete(apiToken).where(eq(apiToken.userId, u.id));
    await cleanupCreatedUsers(db);
  }
  await db.$client.end();
});

function getWithAuth(plain?: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (plain) headers.authorization = `Bearer ${plain}`;
  if (cookie) headers.cookie = cookie;
  return buildApp().request('/api/tokens', { headers });
}

describe('Bearer token 认证中间件（T17）', () => {
  it('合法 token → principal 生效（200 列表本人可见）', async () => {
    const u = await makeUser('bearer-u1');
    const { plain } = await mintToken(u);
    const res = await getWithAuth(plain);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: number }> };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('吊销 token → 401（匿名，requireAuth 出）', async () => {
    const u = await makeUser('bearer-u2');
    const { plain } = await mintToken(u, { revoked: true });
    const res = await getWithAuth(plain);
    expect(res.status).toBe(401);
  });

  it('过期 token（expiresAt 已过）→ 401', async () => {
    const u = await makeUser('bearer-u3');
    const { plain } = await mintToken(u, { expiresAt: new Date(Date.now() - 60_000) });
    const res = await getWithAuth(plain);
    expect(res.status).toBe(401);
  });

  it('未知/垃圾 token → 401', async () => {
    const res = await getWithAuth('aih_this-token-does-not-exist-in-db');
    expect(res.status).toBe(401);
  });

  it('坏格式（Basic 头 / 空）→ 回退：无 cookie → 401', async () => {
    const noHeader = await buildApp().request('/api/tokens');
    expect(noHeader.status).toBe(401);
    const basic = await buildApp().request('/api/tokens', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(basic.status).toBe(401);
  });

  it('token 用户 DISABLED → 拒（401）', async () => {
    const u = await makeUser('bearer-disabled', 'DISABLED');
    const { plain } = await mintToken(u);
    const res = await getWithAuth(plain);
    expect(res.status).toBe(401);
  });

  it('Bearer 与 cookie 并存 → Bearer 为准（B cookie 不覆盖 A principal）', async () => {
    const a = await makeUser('bearer-priority-a');
    const b = await makeUser('bearer-priority-b');
    const { plain } = await mintToken(a);
    await mintToken(b); // B 的 token（不应出现在 A 视角列表）
    const cookie = await signInCookie(auth, b);
    const res = await getWithAuth(plain, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: number }> };
    const aRows = await db.select().from(apiToken).where(eq(apiToken.userId, a));
    const bRows = await db.select().from(apiToken).where(eq(apiToken.userId, b));
    // 列表 = A 的全部 token（不含 B 的）
    expect(body.items).toHaveLength(aRows.length);
    expect(body.items.length).toBeGreaterThan(0);
    expect(bRows.length).toBeGreaterThan(0); // 前置条件成立
  });

  it('无效 Bearer + 有效 cookie → 401（显式凭证不降级回 cookie）', async () => {
    const b = await makeUser('bearer-nodowngrade');
    const cookie = await signInCookie(auth, b);
    const res = await getWithAuth('aih_invalid-token-for-downgrade-check', cookie);
    expect(res.status).toBe(401);
  });

  it('Bearer POST 无 Origin → 非 403（显式凭证通道 CSRF 豁免）', async () => {
    const u = await makeUser('bearer-csrf');
    const { plain } = await mintToken(u);
    const res = await buildApp().request('/api/tokens', {
      method: 'POST',
      headers: { authorization: `Bearer ${plain}`, 'content-type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(201);
  });

  it('T18：Bearer 与 session 通道走同一 requirePermission（RBAC 同判）', async () => {
    const admin = await makeUser('bearer-rbac-admin');
    const plainUser = await makeUser('bearer-rbac-plain');
    await setRole(admin, ACCOUNT_ROLE.ADMIN);
    const adminToken = await mintToken(admin);
    const plainToken = await mintToken(plainUser);

    const origin = { origin: 'http://localhost:3000', host: 'localhost:3000' };
    // 管理档 + Bearer → 200（requireRole(ADMIN) 门通过——session 通道同门同判）
    const ok = await buildApp().request('/api/audit?limit=1', {
      method: 'GET',
      headers: { ...origin, authorization: `Bearer ${adminToken.plain}` },
    });
    expect(ok.status).toBe(200);
    // 普通用户 + Bearer → 403 forbidden（与 session 通道同一 403 码）
    const denied = await buildApp().request('/api/audit?limit=1', {
      method: 'GET',
      headers: { ...origin, authorization: `Bearer ${plainToken.plain}` },
    });
    expect(denied.status).toBe(403);
    const body = (await denied.json()) as { code: string };
    expect(body.code).toBe('auth.forbidden');
  });
});
