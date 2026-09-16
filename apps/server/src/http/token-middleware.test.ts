import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';
import {
  cleanupCreatedUsers,
  createTestUser,
  mintApiKey,
  setUserRole,
  signInCookie,
} from '../test-utils/auth-fixture.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { ACCOUNT_ROLE, type AccountRole, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import { apikey, auditLog, user } from '../db/schema/index.js';
import { createAuditRoutes } from './audit.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { tokenAuthMiddleware } from './token-middleware.js';
import { createTokenRoutes } from './tokens.js';

/**
 * Bearer 通道集成测试（T17 语义 + M4b-pre T4 官方 api-key 切流）。
 * 造数一律走官方签发（`mintApiKey`）——不手搓哈希、不直写表。
 */

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
): Promise<{ id: string; plain: string }> {
  // 官方 create 的最小过期 = 1 小时 ⇒ 「已过期」造数只能签发后改库（测试专用）
  const alreadyExpired =
    opts.expiresAt !== null &&
    opts.expiresAt !== undefined &&
    opts.expiresAt.getTime() <= Date.now();
  const issued = await mintApiKey(auth, userId, {
    expiresAt: alreadyExpired ? null : (opts.expiresAt ?? null),
  });
  if (alreadyExpired) {
    await db.update(apikey).set({ expiresAt: opts.expiresAt! }).where(eq(apikey.id, issued.id));
  }
  if (opts.revoked) {
    // 吊销 = 官方 enabled=false（走官方 update 端点，服务端直呼）
    const { revokeApiKey } = await import('../auth/api-keys.js');
    await revokeApiKey(auth, { keyId: issued.id, ownerId: userId });
  }
  return issued;
}

/** 该用户名下的令牌行数（列表断言用；官方表按 reference_id 归属） */
async function keyCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: apikey.id })
    .from(apikey)
    .where(eq(apikey.referenceId, userId));
  return rows.length;
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', tokenAuthMiddleware(db, auth));
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
  app.route('/api/tokens', createTokenRoutes({ db, auth }));
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
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

function getWithAuth(plain?: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (plain) headers.authorization = `Bearer ${plain}`;
  if (cookie) headers.cookie = cookie;
  return buildApp().request('/api/tokens', { headers });
}

describe('Bearer token 认证中间件（T17 · 官方 api-key 校验）', () => {
  it('合法 token → principal 生效（200 列表本人可见）', async () => {
    const u = await makeUser('bearer-u1');
    const { plain } = await mintToken(u);
    const res = await getWithAuth(plain);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(await keyCount(u));
  });

  it('吊销 token（官方 enabled=false）→ 401（匿名，requireAuth 出）', async () => {
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

  it('token 用户 DISABLED → 拒（401；账号状态门由本中间件判——官方 verify 不看该列）', async () => {
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
    const body = (await res.json()) as { items: Array<{ id: string }> };
    // 列表 = A 的全部 token（不含 B 的）
    expect(body.items).toHaveLength(await keyCount(a));
    expect(body.items.length).toBeGreaterThan(0);
    expect(await keyCount(b)).toBeGreaterThan(0); // 前置条件成立
  });

  it('无效 Bearer + 有效 cookie → 401（显式凭证不降级回 cookie）', async () => {
    const b = await makeUser('bearer-nodowngrade');
    const cookie = await signInCookie(auth, b);
    const res = await getWithAuth('aih_invalid-token-for-downgrade-check', cookie);
    expect(res.status).toBe(401);
  });

  it('Bearer POST 无 Origin → 非 403（显式凭证通道 origin 守卫豁免）', async () => {
    const u = await makeUser('bearer-csrf');
    const { plain } = await mintToken(u);
    const res = await buildApp().request('/api/tokens', {
      method: 'POST',
      headers: { authorization: `Bearer ${plain}`, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'bearer-csrf' }), // M4b-3：名称必填
    });
    expect(res.status).toBe(201);
  });

  it('T18：Bearer 与 session 通道走同一 requireRole（RBAC 同判）', async () => {
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
