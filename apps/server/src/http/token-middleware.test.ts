import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { hashToken } from '../auth/tokens.js';
import { createClient, type Db } from '../db/client.js';
import {
  apiToken,
  namespace,
  namespaceMember,
  type RoleCode,
  role,
  userAccount,
  userRoleBinding,
} from '../db/schema/index.js';
import { rbacContext } from './auth-middleware.js';
import { createNamespaceRoutes } from './namespaces.js';
import { tokenAuthMiddleware } from './token-middleware.js';
import { createTokenRoutes } from './tokens.js';

let db: Db;
let sessions: SessionManager;
let rbac: RbacService;

async function makeUser(
  displayName: string,
  status: 'ACTIVE' | 'DISABLED' = 'ACTIVE',
): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status });
  return id;
}

async function ensureRole(roleCode: RoleCode) {
  await db
    .insert(role)
    .values({ code: roleCode, name: `role-${roleCode}`, isSystem: true })
    .onConflictDoNothing();
}

async function bindRole(userId: string, roleCode: RoleCode) {
  const rows = await db.select().from(role).where(eq(role.code, roleCode));
  await db.insert(userRoleBinding).values({ userId, roleId: rows[0]!.id });
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
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
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
  app.route('/api/namespaces', createNamespaceRoutes({ db }));
  return app;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
});

afterAll(async () => {
  const nss = await db
    .select({ id: namespace.id })
    .from(namespace)
    .where(like(namespace.slug, 't18-%'));
  const nsIds = nss.map((n) => n.id);
  if (nsIds.length > 0) {
    await db.delete(namespaceMember).where(inArray(namespaceMember.namespaceId, nsIds));
    await db.delete(namespace).where(inArray(namespace.id, nsIds));
  }
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'bearer-%'));
  for (const u of users) {
    await db.delete(apiToken).where(eq(apiToken.userId, u.id));
    await db.delete(userRoleBinding).where(eq(userRoleBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
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
    const sid = await sessions.createSession(b, 'bearer-test');
    const res = await getWithAuth(plain, `aih_session=${sid}`);
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
    const sid = await sessions.createSession(b, 'bearer-test');
    const res = await getWithAuth('aih_invalid-token-for-downgrade-check', `aih_session=${sid}`);
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
    await ensureRole('ASSET_ADMIN');
    const admin = await makeUser('bearer-rbac-admin');
    const plainUser = await makeUser('bearer-rbac-plain');
    await bindRole(admin, 'ASSET_ADMIN');
    const adminToken = await mintToken(admin);
    const plainToken = await mintToken(plainUser);

    const origin = { origin: 'http://localhost:3000', host: 'localhost:3000' };
    // ASSET_ADMIN + Bearer → 201（session 通道同权限已在 namespaces.test 覆盖，此处对照同判）
    const ok = await buildApp().request('/api/namespaces', {
      method: 'POST',
      headers: {
        ...origin,
        authorization: `Bearer ${adminToken.plain}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ slug: 't18-bearer-admin', displayName: 't18 bearer admin' }),
    });
    expect(ok.status).toBe(201);
    // 普通用户 + Bearer → 403 forbidden（与 session 通道同一 403 码）
    const denied = await buildApp().request('/api/namespaces', {
      method: 'POST',
      headers: {
        ...origin,
        authorization: `Bearer ${plainToken.plain}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ slug: 't18-bearer-plain', displayName: 't18 bearer plain' }),
    });
    expect(denied.status).toBe(403);
    const body = (await denied.json()) as { code: string };
    expect(body.code).toBe('auth.forbidden');
  });
});
