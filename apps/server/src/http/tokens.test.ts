import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { count, eq, like } from 'drizzle-orm';
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
import { apiToken, userAccount } from '../db/schema/index.js';
import { rbacContext } from './auth-middleware.js';
import { createTokenRoutes } from './tokens.js';

let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let u1: string; // 普通 ACTIVE 用户（无平台角色——签发本人 token 不需权限码）

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'token-test');
  return `aih_session=${sid}`;
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
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
  return app;
}

const ORIGIN = { origin: 'http://localhost:3000' };

function postJson(url: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...ORIGIN,
    host: 'localhost:3000',
  };
  if (cookie) headers.cookie = cookie;
  const payload = body === undefined ? '' : JSON.stringify(body);
  return buildApp().request(url, { method: 'POST', headers, body: payload });
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  u1 = await makeUser('tok-u1');
});

afterAll(async () => {
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'tok-%'));
  for (const u of users) {
    await db.delete(apiToken).where(eq(apiToken.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

describe('POST /api/tokens（T14 签发）', () => {
  it('匿名 → 401 session_expired', async () => {
    // 同源 POST（csrf 放行）无 cookie → requireAuth 401（csrf 面：无 Origin 的 POST 是 403，另测）
    const res = await buildApp().request('/api/tokens', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...ORIGIN, host: 'localhost:3000' },
      body: '{}',
    });
    expect(res.status).toBe(401);
  });

  it('省略 expiresInDays → 201 永不过期（expiresAt null），明文一次 + 库中仅哈希', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', {}, cookie);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; token: string; expiresAt: string | null };
    expect(body.token.startsWith('aih_')).toBe(true);
    expect(body.token).toHaveLength(47);
    expect(body.expiresAt).toBeNull();

    const [row] = await db.select().from(apiToken).where(eq(apiToken.id, body.id));
    expect(row).toBeDefined();
    // 库中仅 sha256 hex，明文不落库
    expect(row!.tokenHash).toBe(hashToken(body.token));
    expect(row!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row!.tokenHash).not.toContain(body.token);
    expect(row!.scope).toBe('');
    expect(row!.userId).toBe(u1);
    expect(row!.expiresAt).toBeNull();
  });

  it('expiresInDays=30 → expiresAt 约 now+30d', async () => {
    const before = Date.now();
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { expiresInDays: 30 }, cookie);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; token: string; expiresAt: string };
    const at = new Date(body.expiresAt).getTime();
    expect(at).toBeGreaterThanOrEqual(before + 29 * 86_400_000);
    expect(at).toBeLessThanOrEqual(before + 31 * 86_400_000);
  });

  it('expiresInDays 超界（0 / 3651 / 非整数）→ 400 request.invalid', async () => {
    const cookie = await cookieFor(u1);
    for (const bad of [0, 3651, 30.5]) {
      const res = await postJson('/api/tokens', { expiresInDays: bad }, cookie);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('request.invalid');
    }
  });

  it('非法 JSON body → 400', async () => {
    const cookie = await cookieFor(u1);
    const res = await buildApp().request('/api/tokens', {
      method: 'POST',
      headers: { ...ORIGIN, host: 'localhost:3000', cookie, 'content-type': 'application/json' },
      body: '{not-json',
    });
    expect(res.status).toBe(400);
  });

  it('无平台角色普通用户可签（签发本人 token 不需权限码）', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', undefined, cookie);
    expect(res.status).toBe(201);
  });
});

describe('GET /api/tokens（T15 列表）', () => {
  it('匿名 → 401', async () => {
    const res = await buildApp().request('/api/tokens');
    expect(res.status).toBe(401);
  });

  it('仅返回本人 token；含过期/吊销/永不过期混合状态；倒序', async () => {
    const cookie = await cookieFor(u1);
    // u1 签三个：永不过期 / 30d / 吊销（模拟 T16 后状态：直改 revokedAt）
    const mints = [
      await postJson('/api/tokens', {}, cookie),
      await postJson('/api/tokens', { expiresInDays: 30 }, cookie),
    ];
    expect(mints[0]!.status).toBe(201);
    expect(mints[1]!.status).toBe(201);
    const [never, withExpiry] = (await Promise.all(mints.map((m) => m.json()))) as Array<{
      id: number;
    }>;
    const neverId = never!.id;
    const withExpiryId = withExpiry!.id;
    await db.update(apiToken).set({ revokedAt: new Date() }).where(eq(apiToken.id, neverId));

    // 他人（u2 视角单独造一个 ACTIVE 用户）的 token 不入列表
    const u2 = await makeUser('tok-u2');
    const [u2Token] = await db
      .insert(apiToken)
      .values({ userId: u2, tokenHash: hashToken('aih_other-user-token-00000'), scope: '' })
      .returning({ id: apiToken.id });

    const res = await buildApp().request('/api/tokens', { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{
        id: number;
        scope: string | null;
        expiresAt: string | null;
        revokedAt: string | null;
        createdAt: string;
      }>;
    };
    const ids = body.items.map((t) => t.id);
    expect(ids).toContain(neverId);
    expect(ids).toContain(withExpiryId);
    expect(ids).not.toContain(u2Token!.id);
    // 列表 = 本人全部 token（含 T14 同文件累计签发的，集合关系断言防并行/累计残留误判）
    const [u1Count] = await db
      .select({ total: count() })
      .from(apiToken)
      .where(eq(apiToken.userId, u1));
    expect(body.items).toHaveLength(u1Count!.total);
    // 状态可见：吊销项 revokedAt 非空
    const revoked = body.items.find((t) => t.id === neverId);
    expect(revoked!.revokedAt).not.toBeNull();
    const active = body.items.find((t) => t.id === withExpiryId);
    expect(active!.revokedAt).toBeNull();
    expect(active!.expiresAt).not.toBeNull();
    // 倒序：本用例后签的（withExpiry）在吊销的前面（createdAt desc）
    expect(body.items[0]!.id).toBe(withExpiryId);

    // 清理 u2（含其 token 行）
    await db.delete(apiToken).where(eq(apiToken.userId, u2));
    await db.delete(userAccount).where(eq(userAccount.id, u2));
  });
});
