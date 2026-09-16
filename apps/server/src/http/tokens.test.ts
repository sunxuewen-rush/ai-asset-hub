import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { and, count, eq } from 'drizzle-orm';
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

import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { ACCOUNT_ROLE, type AccountRole, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import { apikey, auditLog, user } from '../db/schema/index.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { tokenAuthMiddleware } from './token-middleware.js';
import { createTokenRoutes } from './tokens.js';

/**
 * /api/tokens 三端点契约测试（T14-T16；M4b-pre T4 起内部 = 官方 api-key 插件）。
 *
 * 形状不变量（design §8）：`POST` 明文一次性返回 + `{id, token, expiresAt}`；`GET` 本人列表
 * `{items:[{id, scope, expiresAt, revokedAt, createdAt}]}`；`DELETE` 幂等 204。
 * T4 登记的两处差异：`id` 为官方文本主键（旧自增整数）；历史 `'cli'` 在列表回 `''`。
 */

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
  // 装配镜像 app.ts：Bearer（tokens）→ 官方会话（cookie）
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
  app.route('/api/tokens', createTokenRoutes({ db, auth, audit }));
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

/** 官方落库形态：`base64url(sha256(明文))`（无填充） */
function officialHash(plain: string): string {
  return createHash('sha256').update(plain).digest('base64url');
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
  // 夹具登记制清理（审计行 → 令牌行（官方 apikey）→ 用户；会话/凭据级联）
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

describe('POST /api/tokens（T14 签发）', () => {
  it('匿名 → 401 session_expired', async () => {
    const res = await buildApp().request('/api/tokens', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...ORIGIN, host: 'localhost:3000' },
      body: '{}',
    });
    expect(res.status).toBe(401);
  });

  it('省略 expiresInDays → 201 永不过期（expiresAt null），明文一次 + 库中仅官方哈希', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { name: 'no-expiry' }, cookie);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; token: string; expiresAt: string | null };
    expect(body.token.startsWith('aih_')).toBe(true);
    expect(body.token).toHaveLength(47);
    expect(body.expiresAt).toBeNull();

    const [row] = await db.select().from(apikey).where(eq(apikey.id, body.id));
    expect(row).toBeDefined();
    // 库中仅官方哈希（base64url(sha256)），明文不落库
    expect(row!.key).toBe(officialHash(body.token));
    expect(row!.key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(row!.key).not.toContain(body.token);
    // scope 缺省 = 全量 ⇒ 官方 permissions 不写（NULL）
    expect(row!.permissions).toBeNull();
    expect(row!.referenceId).toBe(u1);
    expect(row!.enabled).toBe(true);
    expect(row!.rateLimitEnabled).toBe(false); // R7：行级同口径关限流
    expect(row!.expiresAt).toBeNull();
    // T17 审计：token.issue 落位 + detail 明文零落（敏感载荷纪律）
    const auditRows = await db
      .select({ action: auditLog.action, detail: auditLog.detail })
      .from(auditLog)
      .where(eq(auditLog.actorId, u1));
    const issueRows = auditRows.filter((r) => r.action === 'token.issue');
    expect(issueRows.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(issueRows[issueRows.length - 1]!.detail)).not.toContain(body.token);
  });

  it('scope 非空 → 官方 permissions 形态落库（`{audit:["read"]}`）', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { name: 'scoped', scope: ['audit:read'] }, cookie);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    const [row] = await db.select().from(apikey).where(eq(apikey.id, body.id));
    expect(JSON.parse(row!.permissions ?? 'null')).toEqual({ audit: ['read'] });
  });

  it('expiresInDays=30 → expiresAt 约 now+30d', async () => {
    const before = Date.now();
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { name: 'expiry-30', expiresInDays: 30 }, cookie);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; token: string; expiresAt: string };
    const at = new Date(body.expiresAt).getTime();
    expect(at).toBeGreaterThanOrEqual(before + 29 * 86_400_000);
    expect(at).toBeLessThanOrEqual(before + 31 * 86_400_000);
  });

  it('expiresInDays 上界 3650 天仍受理（官方 keyExpiration.maxExpiresIn 配置生效）', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { name: 'expiry-max', expiresInDays: 3650 }, cookie);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { expiresAt: string };
    const days = (new Date(body.expiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(3648);
  });

  it('expiresInDays 超界（0 / 3651 / 非整数）→ 400 request.invalid', async () => {
    const cookie = await cookieFor(u1);
    for (const bad of [0, 3651, 30.5]) {
      const res = await postJson(
        '/api/tokens',
        { name: 'out-of-range', expiresInDays: bad },
        cookie,
      );
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
    const res = await postJson('/api/tokens', { name: 'plain-user' }, cookie);
    expect(res.status).toBe(201);
  });

  it('多 scope 同 resource → permissions 保全全部 action（防单层聚合静默丢权）', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson(
      '/api/tokens',
      { name: 'multi-scope', scope: ['asset:publish', 'asset:manage'] },
      cookie,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    const [row] = await db.select().from(apikey).where(eq(apikey.id, body.id));
    expect((JSON.parse(row!.permissions ?? 'null') as { asset: string[] }).asset.sort()).toEqual([
      'manage',
      'publish',
    ]);
    // 列表回显 scope 码（逗号串；顺序无关）
    const list = await buildApp().request('/api/tokens', { headers: { cookie } });
    const items = ((await list.json()) as { items: Array<{ id: string; scope: string }> }).items;
    const scopes = new Set(items.find((t) => t.id === body.id)!.scope.split(','));
    expect(scopes).toEqual(new Set(['asset:publish', 'asset:manage']));
  });

  it('审计落 `target_type = api_key`（design §8 登记项：表已由 api_token 换为官方 apikey）', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { name: 'audit-target' }, cookie);
    const body = (await res.json()) as { id: string };
    const rows = await db
      .select({
        action: auditLog.action,
        targetType: auditLog.targetType,
        targetId: auditLog.targetId,
      })
      .from(auditLog)
      .where(and(eq(auditLog.actorId, u1), eq(auditLog.targetId, body.id)));
    const issue = rows.find((r) => r.action === 'token.issue');
    expect(issue?.targetType).toBe('api_key');

    const del = await buildApp().request(`/api/tokens/${body.id}`, {
      method: 'DELETE',
      headers: { cookie, ...ORIGIN, host: 'localhost:3000' },
    });
    expect(del.status).toBe(204);
    const after = await db
      .select({ action: auditLog.action, targetType: auditLog.targetType })
      .from(auditLog)
      .where(and(eq(auditLog.actorId, u1), eq(auditLog.targetId, body.id)));
    expect(after.find((r) => r.action === 'token.revoke')?.targetType).toBe('api_key');
  });

  it('吊销后明文立即失效（端到端 401 对照：签发 201 → 吊销 204 → Bearer 401）', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { name: 'revoke-e2e' }, cookie);
    const body = (await res.json()) as { id: string; token: string };
    // 未吊销前：Bearer 可用（令牌通道经 token-middleware → requireAuth）
    const before = await buildApp().request('/api/tokens', {
      headers: { ...ORIGIN, host: 'localhost:3000', authorization: `Bearer ${body.token}` },
    });
    expect(before.status).toBe(200);
    const del = await buildApp().request(`/api/tokens/${body.id}`, {
      method: 'DELETE',
      headers: { cookie, ...ORIGIN, host: 'localhost:3000' },
    });
    expect(del.status).toBe(204);
    const after = await buildApp().request('/api/tokens', {
      headers: { ...ORIGIN, host: 'localhost:3000', authorization: `Bearer ${body.token}` },
    });
    expect(after.status).toBe(401);
  });
});

describe('GET /api/tokens（T15 列表）', () => {
  it('匿名 → 401', async () => {
    const res = await buildApp().request('/api/tokens');
    expect(res.status).toBe(401);
  });

  it('仅返回本人 token；含过期/吊销/永不过期混合状态；倒序', async () => {
    const cookie = await cookieFor(u1);
    const mints = [
      await postJson('/api/tokens', { name: 'list-never' }, cookie),
      await postJson('/api/tokens', { name: 'expiry-30', expiresInDays: 30 }, cookie),
    ];
    expect(mints[0]!.status).toBe(201);
    expect(mints[1]!.status).toBe(201);
    const [never, withExpiry] = (await Promise.all(mints.map((m) => m.json()))) as Array<{
      id: string;
    }>;
    const neverId = never!.id;
    const withExpiryId = withExpiry!.id;
    // 吊销（走官方 enabled=false；等价 DELETE 端点效果）
    await buildApp().request(`/api/tokens/${neverId}`, {
      method: 'DELETE',
      headers: { cookie, ...ORIGIN, host: 'localhost:3000' },
    });

    // 他人的 token 不入列表（u2 视角单独造一个 ACTIVE 用户；造数走官方签发）
    const u2 = await makeUser('tok-u2');
    const u2Token = await mintApiKey(auth, u2);

    const res = await buildApp().request('/api/tokens', { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{
        id: string;
        scope: string | null;
        expiresAt: string | null;
        revokedAt: string | null;
        createdAt: string;
      }>;
    };
    const ids = body.items.map((t) => t.id);
    expect(ids).toContain(neverId);
    expect(ids).toContain(withExpiryId);
    expect(ids).not.toContain(u2Token.id);
    // 列表 = 本人全部 token（集合关系断言防并行/累计残留误判）
    const [u1Count] = await db
      .select({ total: count() })
      .from(apikey)
      .where(eq(apikey.referenceId, u1));
    expect(body.items).toHaveLength(u1Count!.total);
    // 状态可见：吊销项 revokedAt 非空；活项为 null
    const revoked = body.items.find((t) => t.id === neverId);
    expect(revoked!.revokedAt).not.toBeNull();
    const active = body.items.find((t) => t.id === withExpiryId);
    expect(active!.revokedAt).toBeNull();
    expect(active!.expiresAt).not.toBeNull();
    // 倒序：本用例后签的（withExpiry）在吊销的前面（createdAt desc）
    expect(body.items[0]!.id).toBe(withExpiryId);
    // scope 口径：全量（permissions NULL）回 `''`
    const full = body.items.find((t) => t.id === withExpiryId);
    expect(full!.scope).toBe('');
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

  async function mintFor(userId: string): Promise<string> {
    const { id } = await mintApiKey(auth, userId);
    return id;
  }

  it('匿名 DELETE → 401（同源无 cookie）', async () => {
    const res = await deleteReq('/api/tokens/1');
    expect(res.status).toBe(401);
  });

  it('本人吊销 → 204 + 官方 enabled=false 落库；重复吊销幂等 204', async () => {
    const id = await mintFor(u1);
    const cookie = await cookieFor(u1);
    const res = await deleteReq(`/api/tokens/${id}`, cookie);
    expect(res.status).toBe(204);
    const [row] = await db.select().from(apikey).where(eq(apikey.id, id));
    expect(row!.enabled).toBe(false);
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
    const [row] = await db.select().from(apikey).where(eq(apikey.id, id));
    expect(row!.enabled).toBe(true); // 未被吊销
  });

  it('SUPER_ADMIN 吊销他人 token ⇒ 404（令牌彻底私有：本人以外视同不存在；2026-09-16 契约变更）', async () => {
    const id = await mintFor(u1);
    const cookie = await cookieFor(superAdmin);
    const res = await deleteReq(`/api/tokens/${id}`, cookie);
    expect(res.status).toBe(404);
    const [row] = await db.select().from(apikey).where(eq(apikey.id, id));
    expect(row!.enabled).toBe(true); // 未被吊销
  });

  it('不存在 id → 404；畸形 id → 400；无 Origin 的 DELETE 走业务语义（origin 守卫已前置）', async () => {
    const cookie = await cookieFor(u1);
    expect((await deleteReq('/api/tokens/999999', cookie)).status).toBe(404);
    // T4：`id` 为官方文本主键 ⇒ 字母数字形态合法（不存在 → 404）；畸形（空/超长/含非法字符）→ 400
    expect((await deleteReq('/api/tokens/nonexistent-key', cookie)).status).toBe(404);
    expect((await deleteReq(`/api/tokens/${'x'.repeat(65)}`, cookie)).status).toBe(400);
    expect((await deleteReq('/api/tokens/bad%20id', cookie)).status).toBe(400);
    expect((await deleteReq('/api/tokens/1', cookie, false)).status).toBe(404);
  });
});

describe('读面加性 + 掩码配置（M4b-3 T2 · design §4.2 / §5）', () => {
  interface TokenRow {
    id: string;
    scope: string;
    name: string | null;
    start: string | null;
    tail: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
    createdAt: string;
    lastRequest: string | null;
  }

  async function listRows(cookie: string): Promise<TokenRow[]> {
    const res = await buildApp().request('/api/tokens', { headers: { cookie } });
    expect(res.status).toBe(200);
    return ((await res.json()) as { items: TokenRow[] }).items;
  }

  it('命名：带 name 签发 ⇒ 列表回显', async () => {
    const cookie = await cookieFor(u1);
    const named = await postJson('/api/tokens', { name: 'CI 发布用' }, cookie);
    expect(named.status).toBe(201);
    const namedId = ((await named.json()) as { id: string }).id;

    const rows = await listRows(cookie);
    expect(rows.find((t) => t.id === namedId)!.name).toBe('CI 发布用');
  });

  it('名称必填（2026-09-16 契约变更）：缺 name / 空串 / 纯空白 ⇒ 400 request.invalid', async () => {
    const cookie = await cookieFor(u1);
    for (const body of [{}, { name: '' }, { name: '   ' }]) {
      const res = await postJson('/api/tokens', body, cookie);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe('request.invalid');
    }
  });

  it('名称上限 32（官方 maximumNameLength 钉定）：32 字受理 / 33 字 ⇒ 400', async () => {
    const cookie = await cookieFor(u1);
    expect((await postJson('/api/tokens', { name: 'x'.repeat(32) }, cookie)).status).toBe(201);
    expect((await postJson('/api/tokens', { name: 'x'.repeat(33) }, cookie)).status).toBe(400);
  });

  it('Key 掩码：start = 明文前 12 位（含 aih_ 前缀）· tail = 明文后 4 位', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { name: 'mask' }, cookie);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; token: string };
    const row = (await listRows(cookie)).find((t) => t.id === body.id)!;
    expect(row.start).toHaveLength(12);
    expect(row.start!.startsWith('aih_')).toBe(true);
    expect(body.token.startsWith(row.start!)).toBe(true);
    expect(row.tail).toHaveLength(4);
    expect(body.token.endsWith(row.tail!)).toBe(true);
    // 明文整体不得出现在列表项中（既有「库/读面仅片段」纪律保持）
    expect(JSON.stringify(row)).not.toContain(body.token);
  });

  it('metadata 列实读含 tail（JSON 容错解析）· lastRequest 字段存在（未使用 ⇒ null）', async () => {
    const cookie = await cookieFor(u1);
    const res = await postJson('/api/tokens', { name: 'meta-shape' }, cookie);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; token: string };
    const [dbRow] = await db.select().from(apikey).where(eq(apikey.id, body.id));
    const raw = dbRow!.metadata!;
    expect(typeof raw).toBe('string');
    // 落库形态 = **单层 JSON 文本**（`{"tail":"…"}`）；`parseTail` 另留双串化历史形态容错
    const value = JSON.parse(raw) as { tail?: string };
    expect(typeof value).toBe('object');
    expect(value.tail).toBe(body.token.slice(-4));

    const row = (await listRows(cookie)).find((t) => t.id === body.id)!;
    expect('lastRequest' in row).toBe(true);
    expect(row.lastRequest).toBeNull();
  });
});

describe('PATCH /api/tokens/:id（M4b-3 T3 编辑：改名 + 改权限）', () => {
  function patchReq(url: string, body: unknown, cookie?: string) {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...ORIGIN,
      host: 'localhost:3000',
    };
    if (cookie) headers.cookie = cookie;
    return buildApp().request(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  }

  it('路由已注册：PATCH /api/tokens/:id', () => {
    const routes = buildApp().routes.map((r) => `${r.method} ${r.path}`);
    expect(routes).toContain('PATCH /api/tokens/:id');
  });

  it('改名：200 单条（与列表 item 同形）+ 列表回显新名', async () => {
    const cookie = await cookieFor(u1);
    const created = await postJson('/api/tokens', { name: 'edit-me' }, cookie);
    const { id } = (await created.json()) as { id: string };
    const res = await patchReq(`/api/tokens/${id}`, { name: 'CI 发布用' }, cookie);
    expect(res.status).toBe(200);
    const row = (await res.json()) as Record<string, unknown>;
    expect(row.id).toBe(id);
    expect(row.name).toBe('CI 发布用');
    for (const key of [
      'id',
      'scope',
      'name',
      'start',
      'tail',
      'expiresAt',
      'revokedAt',
      'createdAt',
      'lastRequest',
    ]) {
      expect(key in row).toBe(true);
    }
    const list = await buildApp().request('/api/tokens', { headers: { cookie } });
    const items = ((await list.json()) as { items: Array<{ id: string; name: string | null }> })
      .items;
    expect(items.find((t) => t.id === id)!.name).toBe('CI 发布用');
  });

  it("改权限：子集 ⇒ 码串回显；scope: [] ⇒ 全量（''）", async () => {
    const cookie = await cookieFor(u1);
    const created = await postJson('/api/tokens', { name: 'scope-edit' }, cookie);
    const { id } = (await created.json()) as { id: string };

    const narrow = await patchReq(
      `/api/tokens/${id}`,
      { name: 'scope-edit', scope: ['audit:read'] },
      cookie,
    );
    expect(narrow.status).toBe(200);
    expect(((await narrow.json()) as { scope: string }).scope).toBe('audit:read');

    const full = await patchReq(`/api/tokens/${id}`, { name: 'scope-edit', scope: [] }, cookie);
    expect(full.status).toBe(200);
    expect(((await full.json()) as { scope: string }).scope).toBe('');
  });

  it('名称必填：缺失 / 空串 / 纯空白 / 33 字 ⇒ 400 request.invalid', async () => {
    const cookie = await cookieFor(u1);
    const created = await postJson('/api/tokens', { name: 'req-edit' }, cookie);
    const { id } = (await created.json()) as { id: string };
    for (const body of [{}, { name: '' }, { name: '   ' }, { name: 'x'.repeat(33) }]) {
      const res = await patchReq(`/api/tokens/${id}`, body, cookie);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe('request.invalid');
    }
  });

  it('仅本人：SUPER_ADMIN 改他人 token ⇒ 404（且原名保留）', async () => {
    const cookie = await cookieFor(u1);
    const created = await postJson('/api/tokens', { name: 'private-edit' }, cookie);
    const { id } = (await created.json()) as { id: string };
    const res = await patchReq(
      `/api/tokens/${id}`,
      { name: 'hacked' },
      await cookieFor(superAdmin),
    );
    expect(res.status).toBe(404);
    const [row] = await db.select({ name: apikey.name }).from(apikey).where(eq(apikey.id, id));
    expect(row!.name).toBe('private-edit');
  });

  it('不存在 / 畸形 id ⇒ 404 / 400', async () => {
    const cookie = await cookieFor(u1);
    expect((await patchReq('/api/tokens/nonexistent-key', { name: 'x' }, cookie)).status).toBe(404);
    expect((await patchReq('/api/tokens/bad%20id', { name: 'x' }, cookie)).status).toBe(400);
  });

  it('审计：token.update（target_type=api_key）且 detail 零明文', async () => {
    const cookie = await cookieFor(u1);
    const created = await postJson('/api/tokens', { name: 'audit-edit' }, cookie);
    const { id, token } = (await created.json()) as { id: string; token: string };
    const res = await patchReq(
      `/api/tokens/${id}`,
      { name: 'audit-edit-2', scope: ['audit:read'] },
      cookie,
    );
    expect(res.status).toBe(200);
    const rows = await db
      .select({ action: auditLog.action, targetType: auditLog.targetType, detail: auditLog.detail })
      .from(auditLog)
      .where(and(eq(auditLog.actorId, u1), eq(auditLog.targetId, id)));
    const upd = rows.find((r) => r.action === 'token.update');
    expect(upd?.targetType).toBe('api_key');
    const detail = JSON.stringify(upd?.detail ?? null);
    expect(detail).not.toContain(token);
    expect(detail).toContain('name');
  });
});
