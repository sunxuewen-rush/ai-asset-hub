/**
 * `/api/admin` 用户治理面测试（M4c-2 **T2** · 6 薄端点）。
 *
 * 覆盖：**鉴权矩阵**（未登录 401 / 用户档 403）· **超管全链**（建号 → 改角色 → 封禁 → 幂等再封 →
 * 解封 → 吊销会话，每步回读副作用）· **护栏**（改自己 / 封自己 / 提权越界 / 目标不存在）·
 * **F294 互斥筛选 400** · **出参归一**（官方体不外泄 · `{ items, total }` / `{ ok: true }`）。
 *
 * 断言策略（同 `admin.test.ts`）：测试库含其他用例数据 ⇒ 一律 **PREFIX 隔离 + 回读/增量**，不用绝对总数。
 *
 * 已知覆盖缺口（如实登记 · 见批 plan §7 落地记录）：
 * - **F270 哨兵**（官方静默吞错 ⇒ 500 `user.list_failed`）需注入官方侧 DB 异常才可复现 ⇒ 本文件不覆盖；
 * - **末位超管护栏**需「全库仅 1 个活跃超管」的前置，与并行测试文件共享库冲突 ⇒ 归 T7 dogfood（专用数据态）。
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';
import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { ACCOUNT_ROLE, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import { user } from '../db/schema/index.js';
import {
  cleanupCreatedUsers,
  createTestUser,
  setUserRole,
  signInCookie,
} from '../test-utils/auth-fixture.js';
import { createAdminUserRoutes, listLooksSwallowed } from './admin-users.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'admu-';
const PW = 'Passw0rd!seed';

let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let superId: string;
let superCookie: string;
let mgrId: string;
let mgrCookie: string;
let memberId: string;
let memberCookie: string;
let memberRoleBefore: string | null = null;

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', officialSessionMiddleware(auth));
  app.onError((err, c) => {
    if (err instanceof AuthError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/admin', createAdminUserRoutes({ db, auth, audit: createAuditWriter(db) }));
  return app;
}

async function call(
  method: string,
  url: string,
  cookie?: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = {
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
  };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await buildApp().request(url, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function readUser(id: string) {
  const [row] = await db
    .select({ role: user.role, banned: user.banned, username: user.username, name: user.name })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return row ?? null;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });

  superId = await createTestUser(db, {
    id: `${PREFIX}super_${randomUUID()}`,
    displayName: `${PREFIX}super`,
  });
  await setUserRole(db, superId, ACCOUNT_ROLE.SUPER_ADMIN);
  superCookie = await signInCookie(auth, superId);

  mgrId = await createTestUser(db, {
    id: `${PREFIX}mgr_${randomUUID()}`,
    displayName: `${PREFIX}mgr`,
  });
  await setUserRole(db, mgrId, ACCOUNT_ROLE.ADMIN);
  mgrCookie = await signInCookie(auth, mgrId);

  memberId = await createTestUser(db, {
    id: `${PREFIX}member_${randomUUID()}`,
    displayName: `${PREFIX}member`,
  });
  memberCookie = await signInCookie(auth, memberId);
  memberRoleBefore = (await readUser(memberId))?.role ?? null;
});

afterAll(async () => {
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

describe('M4c-2 T2 · 鉴权矩阵', () => {
  it('未登录 ⇒ 401（本仓档位门先拒）', async () => {
    const { status, json } = await call('GET', '/api/admin/users');
    expect(status).toBe(401);
    expect((json as { code: string }).code).toBe('auth.session_expired');
  });

  it('用户档 ⇒ 403', async () => {
    const { status, json } = await call('GET', '/api/admin/users', memberCookie);
    expect(status).toBe(403);
    expect((json as { code: string }).code).toBe('auth.forbidden');
  });
});

describe('M4c-2 T2 · 超管全链（建号 → 改角色 → 封禁 → 解封 → 吊销）', () => {
  const created: string[] = [];

  it('建号：登录名与账号同一次写入（回读 username）· 出参仅 { userId }', async () => {
    // 登录名不得含 `-`（官方校验器 `/^[a-zA-Z0-9_.]+$/` · F281）⇒ PREFIX 只用于 id / 展示名
    const username = `admu${Date.now().toString().slice(-8)}`;
    const { status, json } = await call('POST', '/api/admin/users', superCookie, {
      username,
      name: '测试建号',
      email: `${username}@example.test`,
      role: 'user',
      password: PW,
    });
    expect(status).toBe(201);
    const body = json as { userId: string };
    expect(Object.keys(body)).toEqual(['userId']);
    created.push(body.userId);
    const row = await readUser(body.userId);
    expect(row?.username).toBe(username.toLowerCase());
    expect(row?.role).toBe('user');
  });

  it('建号：登录名占用 ⇒ 409 user.username_taken', async () => {
    const row = await readUser(created[0]!);
    const { status, json } = await call('POST', '/api/admin/users', superCookie, {
      username: row!.username,
      name: '重复',
      email: `dupe-${randomUUID()}@example.test`,
      role: 'user',
      password: PW,
    });
    expect(status).toBe(409);
    expect((json as { code: string }).code).toBe('user.username_taken');
  });

  it('列表：`{ items, total }` 归一 · 官方体不外泄 · 工号筛选命中', async () => {
    const username = (await readUser(created[0]!))!.username!;
    const { status, json } = await call(
      'GET',
      `/api/admin/users?q=${encodeURIComponent(username)}&field=username`,
      superCookie,
    );
    expect(status).toBe(200);
    const body = json as { items: Array<Record<string, unknown>>; total: number };
    expect(Object.keys(body).sort()).toEqual(['items', 'total']);
    expect(body.total).toBeGreaterThanOrEqual(1);
    const hit = body.items.find((i) => i.username === username);
    expect(hit).toBeTruthy();
    expect(Object.keys(hit!).sort()).toEqual(
      [
        'banExpires',
        'banReason',
        'banned',
        'email',
        'lastLoginAt',
        'name',
        'role',
        'userId',
        'username',
      ].sort(),
    );
  });

  it('改角色：200 { ok: true } + 回读生效', async () => {
    const { status, json } = await call(
      'PATCH',
      `/api/admin/users/${created[0]}/role`,
      superCookie,
      {
        role: 'admin',
      },
    );
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect((await readUser(created[0]!))?.role).toBe('admin');
  });

  it('封禁 → 幂等再封 → 解封（回读 banned 三态）', async () => {
    const ban = await call('POST', `/api/admin/users/${created[0]}/ban`, superCookie, {
      reason: 'T2 测试',
    });
    expect(ban.status).toBe(200);
    expect(ban.json).toEqual({ ok: true });
    expect((await readUser(created[0]!))?.banned).toBe(true);

    const again = await call('POST', `/api/admin/users/${created[0]}/ban`, superCookie, {});
    expect(again.status).toBe(200); // 幂等：不报错

    const unban = await call('POST', `/api/admin/users/${created[0]}/unban`, superCookie);
    expect(unban.status).toBe(200);
    expect((await readUser(created[0]!))?.banned).toBe(false);
  });

  it('吊销全部会话：200 { ok: true }（不给会话数量）', async () => {
    const { status, json } = await call(
      'POST',
      `/api/admin/users/${created[0]}/sessions/revoke`,
      superCookie,
    );
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true });
  });
});

describe('M4c-2 T2 · 护栏', () => {
  it('改自己档位 ⇒ 403 user.self_target_forbidden', async () => {
    const { status, json } = await call('PATCH', `/api/admin/users/${superId}/role`, superCookie, {
      role: 'admin',
    });
    expect(status).toBe(403);
    expect((json as { code: string }).code).toBe('user.self_target_forbidden');
  });

  it('封自己 ⇒ 403 user.self_target_forbidden', async () => {
    const { status, json } = await call('POST', `/api/admin/users/${superId}/ban`, superCookie, {});
    expect(status).toBe(403);
    expect((json as { code: string }).code).toBe('user.self_target_forbidden');
  });

  it('提权越界：管理档把他人提到超管 ⇒ 403 user.role_escalation_forbidden（本仓护栏先于官方权限码）', async () => {
    const { status, json } = await call('PATCH', `/api/admin/users/${memberId}/role`, mgrCookie, {
      role: 'superadmin',
    });
    expect(status).toBe(403);
    expect((json as { code: string }).code).toBe('user.role_escalation_forbidden');
    expect((await readUser(memberId))?.role ?? null).toBe(memberRoleBefore); // 零副作用（档位未被改动）
  });

  it('超管把用户提到超管（同档）⇒ 200 + 回读生效（再降回，保持库态）', async () => {
    const up = await call('PATCH', `/api/admin/users/${memberId}/role`, superCookie, {
      role: 'superadmin',
    });
    expect(up.status).toBe(200);
    expect((await readUser(memberId))?.role).toBe('superadmin');
    const down = await call('PATCH', `/api/admin/users/${memberId}/role`, superCookie, {
      role: 'user',
    });
    expect(down.status).toBe(200);
    expect((await readUser(memberId))?.role).toBe('user');
  });

  it('目标不存在 ⇒ 404 user.not_found', async () => {
    const { status, json } = await call(
      'POST',
      `/api/admin/users/${PREFIX}missing/ban`,
      superCookie,
      {},
    );
    expect(status).toBe(404);
    expect((json as { code: string }).code).toBe('user.not_found');
  });
});

describe('M4c-2 T2 · F294 筛选互斥（显式 400，不静默丢条件）', () => {
  it('q + field=username 与 role / status 同用 ⇒ 400', async () => {
    const a = await call('GET', '/api/admin/users?q=abc&field=username&role=admin', superCookie);
    expect(a.status).toBe(400);
    expect((a.json as { code: string }).code).toBe('request.invalid');
    const b = await call('GET', '/api/admin/users?q=abc&field=username&status=active', superCookie);
    expect(b.status).toBe(400);
  });

  it('role 与 status 同时给 ⇒ 400', async () => {
    const { status, json } = await call(
      'GET',
      '/api/admin/users?role=admin&status=active',
      superCookie,
    );
    expect(status).toBe(400);
    expect((json as { code: string }).code).toBe('request.invalid');
  });
});

describe('M4c-2 T7 · F270 哨兵判定（纯函数 · 补 T2 声明的覆盖缺口）', () => {
  it('官方空 + 我方有 ⇒ 判吞错（真 500 user.list_failed）', () => {
    expect(listLooksSwallowed(0, 0, 5)).toBe(true);
  });

  it('官方与我方同为空 ⇒ 放行（真无数据）', () => {
    expect(listLooksSwallowed(0, 0, 0)).toBe(false);
  });

  it('官方有数据 ⇒ 放行（不触发哨兵）', () => {
    expect(listLooksSwallowed(3, 3, 5)).toBe(false);
    expect(listLooksSwallowed(3, 3, 0)).toBe(false);
  });
});
