import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, count, eq, like } from 'drizzle-orm';
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

import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { ACCOUNT_ROLE, type AccountRole, RbacService } from '../auth/rbac.js';
import { hashToken } from '../auth/tokens.js';
import { createClient, type Db } from '../db/client.js';
import { apiToken, auditLog, user } from '../db/schema/index.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { createTokenRoutes } from './tokens.js';

let db: Db;
let audit!: ReturnType<typeof createAuditWriter>;
let auth: AihAuth;
let rbac: RbacService;
let u1: string; // 普通 ACTIVE 用户（无平台角色——签发本人 token 不需权限码）
let superAdmin: string;

async function makeUser(displayName: string): Promise<string> {
  return createTestUser(db, { id: `usr_${randomUUID()}`, displayName });
}

async function setRole(userId: string, role: AccountRole): Promise<void> {
  await setUserRole(db, userId, role);
}

async function cookieFor(userId: string): Promise<string> {
  return signInCookie(auth, userId);
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
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
  app.route('/api/tokens', createTokenRoutes({ db, audit }));
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
  auth = createAuth({ ldap: null });
  audit = createAuditWriter(db);
  u1 = await makeUser('tok-u1');
  superAdmin = await makeUser('tok-super-admin');
  await setRole(superAdmin, ACCOUNT_ROLE.SUPER_ADMIN);
});

afterAll(async () => {
  // 夹具登记制清理（审计行 → api_token → 用户；会话/凭据级联）
  await cleanupCreatedUsers(db);
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
    // T17 审计：token.issue 落位 + detail 明文零落（敏感载荷纪律）
    const auditRows = await db
      .select({ action: auditLog.action, detail: auditLog.detail })
      .from(auditLog)
      .where(and(eq(auditLog.actorId, u1), eq(auditLog.action, 'token.issue')));
    expect(auditRows.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(auditRows[auditRows.length - 1]!.detail)).not.toContain(body.token);
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
  });
});

describe('DELETE /api/tokens/:id（T16 吊销）', () => {
  function deleteReq(url: string, cookie?: string, withOrigin = true) {
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;
    if (withOrigin) {
      headers.origin = ORIGIN.origin;
      headers.host = 'localhost:3000';
    }
    return buildApp().request(url, { method: 'DELETE', headers });
  }

  async function mintFor(userId: string): Promise<number> {
    const [row] = await db
      .insert(apiToken)
      .values({ userId, tokenHash: hashToken(`aih_${randomUUID()}`), scope: '' })
      .returning({ id: apiToken.id });
    return row!.id;
  }

  it('匿名 DELETE → 401（同源无 cookie）', async () => {
    const res = await deleteReq('/api/tokens/1');
    expect(res.status).toBe(401);
  });

  it('本人吊销 → 204 + revokedAt 落库；重复吊销幂等 204', async () => {
    const id = await mintFor(u1);
    const cookie = await cookieFor(u1);
    const res = await deleteReq(`/api/tokens/${id}`, cookie);
    expect(res.status).toBe(204);
    const [row] = await db.select().from(apiToken).where(eq(apiToken.id, id));
    expect(row!.revokedAt).not.toBeNull();
    // 幂等
    const again = await deleteReq(`/api/tokens/${id}`, cookie);
    expect(again.status).toBe(204);
  });

  it('吊销他人 token（普通用户）→ 404 防枚举', async () => {
    const id = await mintFor(u1);
    const u2 = await makeUser('tok-u2');
    const cookie = await cookieFor(u2);
    const res = await deleteReq(`/api/tokens/${id}`, cookie);
    expect(res.status).toBe(404);
    const [row] = await db.select().from(apiToken).where(eq(apiToken.id, id));
    expect(row!.revokedAt).toBeNull(); // 未被吊销
    await db.delete(apiToken).where(eq(apiToken.userId, u2));
  });

  it('SUPER_ADMIN 吊销他人 token → 204（超管治理面）', async () => {
    const id = await mintFor(u1);
    const cookie = await cookieFor(superAdmin);
    const res = await deleteReq(`/api/tokens/${id}`, cookie);
    expect(res.status).toBe(204);
    const [row] = await db.select().from(apiToken).where(eq(apiToken.id, id));
    expect(row!.revokedAt).not.toBeNull();
  });

  it('不存在 id → 404；非法 id → 400；无 Origin 的 DELETE 仍按业务语义判（CSRF 交官方后）', async () => {
    const cookie = await cookieFor(u1);
    expect((await deleteReq('/api/tokens/999999', cookie)).status).toBe(404);
    expect((await deleteReq('/api/tokens/abc', cookie)).status).toBe(400);
    // M4b-pre T3：Origin 校验交官方（仅官方端点面）；业务写请求的跨站保护 = cookie SameSite=Lax
    expect((await deleteReq('/api/tokens/1', cookie, false)).status).toBe(404);
  });
});
