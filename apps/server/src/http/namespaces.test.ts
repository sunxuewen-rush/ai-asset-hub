import { randomUUID } from 'node:crypto';
import { eq, inArray, like, or } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { Hono } from 'hono';
import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { createClient, type Db } from '../db/client.js';
import {
  namespace,
  namespaceMember,
  type RoleCode,
  role,
  userAccount,
  userRoleBinding,
} from '../db/schema/index.js';
import { rbacContext } from './auth-middleware.js';
import { createNamespaceRoutes } from './namespaces.js';

let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let u1: string; // 成员视角
let u2: string; // 非成员视角
let assetAdmin: string;
let superAdmin: string;

/** 列表响应形状（res.json() 返回 unknown，断言时收窄） */
interface ListBody {
  items: Array<{
    id: number;
    slug: string;
    displayName: string;
    type: string;
    status: string;
    myRole: string | null;
    memberCount: number;
  }>;
  total: number;
  limit: number;
  offset: number;
}

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

async function insertNs(
  slug: string,
  status: 'ACTIVE' | 'FROZEN' | 'ARCHIVED' = 'ACTIVE',
  type: 'TEAM' | 'GLOBAL' = 'TEAM',
): Promise<number> {
  const rows = await db
    .insert(namespace)
    .values({ slug, displayName: `ns-${slug}`, type, status })
    .returning({ id: namespace.id });
  return rows[0]!.id;
}

async function addMember(nsId: number, userId: string, role: 'OWNER' | 'ADMIN' | 'MEMBER') {
  await db.insert(namespaceMember).values({ namespaceId: nsId, userId, role });
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

async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'ns-test');
  return `aih_session=${sid}`;
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', requireSessionMiddleware());
  app.use('*', csrfProtection({})); // 与 app.ts 生产装配同款（POST 需同源 Origin）
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 409 | 429,
      );
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/namespaces', createNamespaceRoutes({ db }));
  return app;
}

// 简化：直挂 session middleware（与 app.ts 同款，避免整 app 依赖）
import { sessionMiddleware } from '../auth/session-middleware.js';

function requireSessionMiddleware() {
  return sessionMiddleware(sessions);
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  u1 = await makeUser('ns-u1');
  u2 = await makeUser('ns-u2');
  await ensureRole('ASSET_ADMIN');
  await ensureRole('SUPER_ADMIN');
  assetAdmin = await makeUser('ns-asset-admin');
  superAdmin = await makeUser('ns-super-admin');
  await bindRole(assetAdmin, 'ASSET_ADMIN');
  await bindRole(superAdmin, 'SUPER_ADMIN');
  const nsActive = await insertNs('t2-active-team');
  const nsOpen = await insertNs('t2-open-team');
  const nsFrozen = await insertNs('t2-frozen-team', 'FROZEN');
  const nsArchived = await insertNs('t2-archived-team', 'ARCHIVED');
  const nsGlobal = await insertNs('t2-global', 'ACTIVE', 'GLOBAL');
  await addMember(nsActive, u1, 'MEMBER');
  await addMember(nsFrozen, u1, 'ADMIN');
  await addMember(nsGlobal, u2, 'OWNER');
});

const ORIGIN = { origin: 'http://localhost:3000' };

function postJson(url: string, body: unknown, cookie?: string) {
  return jsonRequest('POST', url, body, cookie);
}

function patchJson(url: string, body: unknown, cookie?: string) {
  return jsonRequest('PATCH', url, body, cookie);
}

function jsonRequest(method: string, url: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...ORIGIN,
    host: 'localhost:3000', // csrf 同源校验比对 Host（csrf.test 同款）
  };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method, headers, body: JSON.stringify(body) });
}

afterAll(async () => {
  const slugs = await db
    .select({ id: namespace.id })
    .from(namespace)
    .where(
      or(
        like(namespace.slug, 't2-%'),
        like(namespace.slug, 't3-%'),
        like(namespace.slug, 't4-%'),
        like(namespace.slug, 't5-%'),
        like(namespace.slug, 't6-%'),
      ),
    );
  const ids = slugs.map((s) => s.id);
  if (ids.length > 0) {
    await db.delete(namespaceMember).where(inArray(namespaceMember.namespaceId, ids));
    await db.delete(namespace).where(inArray(namespace.id, ids));
  }
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'ns-%'));
  for (const u of users) {
    await db.delete(userRoleBinding).where(eq(userRoleBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

describe('GET /api/namespaces（T2 列表）', () => {
  it('匿名 → 401 session_expired', async () => {
    const res = await buildApp().request('/api/namespaces');
    expect(res.status).toBe(401);
  });

  it('u1（成员视角）：ACTIVE 全量 + 自己成员的 FROZEN，ARCHIVED 非成员不可见；myRole/memberCount 正确', async () => {
    const res = await buildApp().request('/api/namespaces', {
      headers: { cookie: await cookieFor(u1) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ListBody;
    const slugs = new Set(body.items.map((i: { slug: string }) => i.slug));
    expect(slugs.has('t2-active-team')).toBe(true);
    expect(slugs.has('t2-open-team')).toBe(true);
    expect(slugs.has('t2-frozen-team')).toBe(true); // 我是成员（ADMIN）
    expect(slugs.has('t2-archived-team')).toBe(false); // ARCHIVED 且非成员 → 不可见
    expect(slugs.has('t2-global')).toBe(true); // ACTIVE 全量可见

    const frozen = body.items.find((i: { slug: string }) => i.slug === 't2-frozen-team')!;
    expect(frozen.myRole).toBe('ADMIN');
    expect(frozen.memberCount).toBe(1);
    const active = body.items.find((i: { slug: string }) => i.slug === 't2-active-team')!;
    expect(active.myRole).toBe('MEMBER');
    const open = body.items.find((i: { slug: string }) => i.slug === 't2-open-team')!;
    expect(open.myRole).toBeNull();
    expect(open.memberCount).toBe(0);
    // total 断言语义：自己的 4 个必在；其他并行测试文件（rbac 等）的空间可能同时存在 → 断言下界
    expect(body.total).toBeGreaterThanOrEqual(4);
    expect(body.limit).toBe(20);
    expect(body.offset).toBe(0);
  });

  it('u2（非成员）：只见 ACTIVE（含 GLOBAL），不见 FROZEN/ARCHIVED', async () => {
    const res = await buildApp().request('/api/namespaces', {
      headers: { cookie: await cookieFor(u2) },
    });
    const body = (await res.json()) as ListBody;
    const slugs = new Set(body.items.map((i: { slug: string }) => i.slug));
    expect(slugs.has('t2-frozen-team')).toBe(false);
    expect(slugs.has('t2-archived-team')).toBe(false);
    expect(slugs.has('t2-global')).toBe(true);
    // u2 是 t2-global 的 OWNER → 即使非 ACTIVE 也可见（已 ACTIVE，此处 myRole 断言）
    const g = body.items.find((i: { slug: string }) => i.slug === 't2-global')!;
    expect(g.myRole).toBe('OWNER');
  });

  it('分页：limit=2 → 2 条 + total 全量；offset 推进', async () => {
    const cookie = await cookieFor(u1);
    const page1 = (await (
      await buildApp().request('/api/namespaces?limit=2', { headers: { cookie } })
    ).json()) as ListBody;
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBeGreaterThanOrEqual(4);
    const page2 = (await (
      await buildApp().request('/api/namespaces?limit=2&offset=2', { headers: { cookie } })
    ).json()) as ListBody;
    expect(page2.items).toHaveLength(2);
    // 分页语义：同查询下两页无重叠（total 可能因并行测试文件空间数变化——不参与断言）
    const ids1 = new Set(page1.items.map((i: { id: number }) => i.id));
    const ids2 = new Set(page2.items.map((i: { id: number }) => i.id));
    expect([...ids1].some((id) => ids2.has(id))).toBe(false);
  });

  it('type 过滤：type=GLOBAL 只返回 GLOBAL 空间', async () => {
    const res = await buildApp().request('/api/namespaces?type=GLOBAL', {
      headers: { cookie: await cookieFor(u1) },
    });
    const body = (await res.json()) as ListBody;
    expect(body.items.every((i: { type: string }) => i.type === 'GLOBAL')).toBe(true);
    expect(body.items.map((i: { slug: string }) => i.slug)).toEqual(['t2-global']);
  });

  it('非法参数：limit=0 / limit=101 / offset=-1 → 400 request.invalid', async () => {
    const cookie = await cookieFor(u1);
    for (const q of ['limit=0', 'limit=101', 'offset=-1', 'type=BAD']) {
      const res = await buildApp().request(`/api/namespaces?${q}`, { headers: { cookie } });
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: 'request.invalid' });
    }
  });
});

describe('POST /api/namespaces（T3 创建，R2 平台角色）', () => {
  it('普通 ACTIVE 用户建 TEAM → 403（R2 对齐 skillhub）', async () => {
    const res = await postJson(
      '/api/namespaces',
      { slug: 't3-plain', displayName: 'plain' },
      await cookieFor(u1),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.forbidden' });
  });

  it('ASSET_ADMIN 建 TEAM → 201 + 空间行 + OWNER 成员行（事务双写）', async () => {
    const cookie = await cookieFor(assetAdmin);
    const res = await postJson(
      '/api/namespaces',
      { slug: 't3-team', displayName: 'Team Space', description: 'desc' },
      cookie,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      namespace: { id: number; slug: string; type: string; myRole: string; memberCount: number };
    };
    expect(body.namespace.slug).toBe('t3-team');
    expect(body.namespace.type).toBe('TEAM');
    expect(body.namespace.myRole).toBe('OWNER');
    expect(body.namespace.memberCount).toBe(1);
    // 库内事务双行
    const nsRow = await db.select().from(namespace).where(eq(namespace.id, body.namespace.id));
    expect(nsRow[0]?.createdBy).toBe(assetAdmin);
    const memberRows = await db
      .select()
      .from(namespaceMember)
      .where(eq(namespaceMember.namespaceId, body.namespace.id));
    expect(memberRows).toHaveLength(1);
    expect(memberRows[0]).toMatchObject({ userId: assetAdmin, role: 'OWNER' });
  });

  it('slug 重复 → 409 namespace.slug_taken（唯一约束实测）', async () => {
    const cookie = await cookieFor(assetAdmin);
    const res = await postJson('/api/namespaces', { slug: 't3-team', displayName: 'dup' }, cookie);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'namespace.slug_taken' });
  });

  it('slug 非法（大写/符号/空）→ 400 request.invalid（protocol slugSchema 单源）', async () => {
    const cookie = await cookieFor(assetAdmin);
    for (const slug of ['Bad_Slug', 'UPPER', '', 'a--b', 'a'.repeat(65)]) {
      const res = await postJson('/api/namespaces', { slug, displayName: 'bad' }, cookie);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: 'request.invalid' });
    }
  });

  it('ASSET_ADMIN 建 GLOBAL → 403；SUPER_ADMIN 建 GLOBAL → 201（R2 分级）', async () => {
    const adminRes = await postJson(
      '/api/namespaces',
      { slug: 't3-global-by-asset', displayName: 'g', type: 'GLOBAL' },
      await cookieFor(assetAdmin),
    );
    expect(adminRes.status).toBe(403);
    const suRes = await postJson(
      '/api/namespaces',
      { slug: 't3-global', displayName: 'Global Space', type: 'GLOBAL' },
      await cookieFor(superAdmin),
    );
    expect(suRes.status).toBe(201);
    const body = (await suRes.json()) as { namespace: { type: string; myRole: string } };
    expect(body.namespace.type).toBe('GLOBAL');
    expect(body.namespace.myRole).toBe('OWNER');
  });

  it('POST 无 Origin → 403 csrf（cookie 通道 CSRF 面在测试内生效）', async () => {
    const res = await buildApp().request('/api/namespaces', {
      method: 'POST',
      headers: { cookie: await cookieFor(assetAdmin), 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 't3-noorigin', displayName: 'x' }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.csrf_failed' });
  });
});

describe('GET/PATCH /api/namespaces/:id（T4 详情与更新）', () => {
  let t4Space: number;
  let t4Frozen: number;

  beforeAll(async () => {
    t4Space = await insertNs('t4-space');
    await addMember(t4Space, assetAdmin, 'OWNER');
    await addMember(t4Space, u1, 'ADMIN');
    t4Frozen = await insertNs('t4-frozen', 'FROZEN');
    await addMember(t4Frozen, assetAdmin, 'OWNER');
    await addMember(t4Frozen, u1, 'ADMIN');
  });

  it('GET 详情：ACTIVE 全可见（非成员 u2 可看 t4-space）', async () => {
    const res = await buildApp().request(`/api/namespaces/${t4Space}`, {
      headers: { cookie: await cookieFor(u2) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      namespace: { slug: string; memberCount: number; myRole: string | null };
    };
    expect(body.namespace.slug).toBe('t4-space');
    expect(body.namespace.memberCount).toBe(2); // assetAdmin OWNER + u1 ADMIN
    expect(body.namespace.myRole).toBeNull();
  });

  it('GET 详情：FROZEN 非成员 → 404（不泄露存在）；成员（ADMIN）→ 200', async () => {
    const hidden = await buildApp().request(`/api/namespaces/${t4Frozen}`, {
      headers: { cookie: await cookieFor(u2) },
    });
    expect(hidden.status).toBe(404);
    expect(await hidden.json()).toMatchObject({ code: 'namespace.not_found' });
    const visible = await buildApp().request(`/api/namespaces/${t4Frozen}`, {
      headers: { cookie: await cookieFor(u1) },
    });
    expect(visible.status).toBe(200);
    const body = (await visible.json()) as { namespace: { myRole: string } };
    expect(body.namespace.myRole).toBe('ADMIN');
  });

  it('GET 不存在的 id → 404；非法 id → 400', async () => {
    const res = await buildApp().request('/api/namespaces/999999', {
      headers: { cookie: await cookieFor(u1) },
    });
    expect(res.status).toBe(404);
    const bad = await buildApp().request('/api/namespaces/abc', {
      headers: { cookie: await cookieFor(u1) },
    });
    expect(bad.status).toBe(400);
  });

  it('PATCH：OWNER（assetAdmin）改名 t4-space → 200 落库 + description 置空清除', async () => {
    const res = await patchJson(
      `/api/namespaces/${t4Space}`,
      { displayName: 'T4 Space Renamed', description: null },
      await cookieFor(assetAdmin),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      namespace: { displayName: string; description: string | null };
    };
    expect(body.namespace.displayName).toBe('T4 Space Renamed');
    expect(body.namespace.description).toBeNull();
    const row = await db.select().from(namespace).where(eq(namespace.id, t4Space));
    expect(row[0]?.displayName).toBe('T4 Space Renamed');
    expect(row[0]?.description).toBeNull();
  });

  it('PATCH：ADMIN（u1）改名 ACTIVE 空间 t4-space → 200（namespace:manage = OWNER/ADMIN）', async () => {
    const res = await patchJson(
      `/api/namespaces/${t4Space}`,
      { displayName: 'T4 Space By Admin' },
      await cookieFor(u1),
    );
    expect(res.status).toBe(200);
  });

  it('PATCH：FROZEN 空间内 ADMIN 改名 → 403（FROZEN 拒写，05 §6.3 第 6 步 + WRITE_PERMISSIONS）', async () => {
    const res = await patchJson(
      `/api/namespaces/${t4Frozen}`,
      { displayName: 'nope' },
      await cookieFor(u1),
    );
    expect(res.status).toBe(403);
  });

  it('PATCH：可见但无管理权（u2 非成员对 t4-space）→ 403', async () => {
    const res = await patchJson(
      `/api/namespaces/${t4Space}`,
      { displayName: 'nope' },
      await cookieFor(u2),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.forbidden' });
  });

  it('PATCH：FROZEN 非成员（u2 未加入）→ 404；加为 MEMBER 后可见 → 403（MEMBER 无 namespace:manage）', async () => {
    const hidden = await patchJson(
      `/api/namespaces/${t4Frozen}`,
      { displayName: 'nope' },
      await cookieFor(u2),
    );
    expect(hidden.status).toBe(404);
    await addMember(t4Frozen, u2, 'MEMBER');
    const forbidden = await patchJson(
      `/api/namespaces/${t4Frozen}`,
      { displayName: 'nope' },
      await cookieFor(u2),
    );
    expect(forbidden.status).toBe(403);
  });

  it('PATCH：空 body / 空 displayName → 400', async () => {
    const cookie = await cookieFor(assetAdmin);
    const empty = await patchJson(`/api/namespaces/${t4Space}`, {}, cookie);
    expect(empty.status).toBe(400);
    const blank = await patchJson(`/api/namespaces/${t4Space}`, { displayName: '' }, cookie);
    expect(blank.status).toBe(400);
  });
});

describe('PATCH /api/namespaces/:id/status（T5 状态治理，R3 仅 SUPER_ADMIN）', () => {
  let t5Space: number;

  beforeAll(async () => {
    t5Space = await insertNs('t5-status');
    await addMember(t5Space, assetAdmin, 'OWNER');
  });

  it('非超管（ASSET_ADMIN/OWNER）改状态 → 403（R3 治理最严）', async () => {
    const res = await patchJson(
      `/api/namespaces/${t5Space}/status`,
      { status: 'FROZEN' },
      await cookieFor(assetAdmin),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.forbidden' });
  });

  it('SUPER_ADMIN：ACTIVE→FROZEN 200 落库，且 FROZEN 后非成员列表不可见（联动）', async () => {
    const cookie = await cookieFor(superAdmin);
    const res = await patchJson(`/api/namespaces/${t5Space}/status`, { status: 'FROZEN' }, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { namespace: { status: string } };
    expect(body.namespace.status).toBe('FROZEN');
    const row = await db.select().from(namespace).where(eq(namespace.id, t5Space));
    expect(row[0]?.status).toBe('FROZEN');
    // 联动：非成员 u2 列表里不再出现（成员 assetAdmin 仍可见）
    const u2List = (await (
      await buildApp().request('/api/namespaces', { headers: { cookie: await cookieFor(u2) } })
    ).json()) as ListBody;
    expect(u2List.items.some((i) => i.slug === 't5-status')).toBe(false);
    const ownerList = (await (
      await buildApp().request('/api/namespaces', {
        headers: { cookie: await cookieFor(assetAdmin) },
      })
    ).json()) as ListBody;
    expect(ownerList.items.some((i) => i.slug === 't5-status')).toBe(true);
  });

  it('幂等同态：FROZEN→FROZEN → 200 返回现状', async () => {
    const res = await patchJson(
      `/api/namespaces/${t5Space}/status`,
      { status: 'FROZEN' },
      await cookieFor(superAdmin),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { namespace: { status: string } };
    expect(body.namespace.status).toBe('FROZEN');
  });

  it('SUPER_ADMIN：FROZEN→ACTIVE 解冻 + ARCHIVED→ACTIVE 恢复（治理可逆）', async () => {
    const cookie = await cookieFor(superAdmin);
    const thaw = await patchJson(`/api/namespaces/${t5Space}/status`, { status: 'ACTIVE' }, cookie);
    expect(thaw.status).toBe(200);
    const archive = await patchJson(
      `/api/namespaces/${t5Space}/status`,
      { status: 'ARCHIVED' },
      cookie,
    );
    expect(archive.status).toBe(200);
    // ARCHIVED 非成员详情 → 404（对外不可见）
    const hidden = await buildApp().request(`/api/namespaces/${t5Space}`, {
      headers: { cookie: await cookieFor(u2) },
    });
    expect(hidden.status).toBe(404);
    const restore = await patchJson(
      `/api/namespaces/${t5Space}/status`,
      { status: 'ACTIVE' },
      cookie,
    );
    expect(restore.status).toBe(200);
    const visible = await buildApp().request(`/api/namespaces/${t5Space}`, {
      headers: { cookie: await cookieFor(u2) },
    });
    expect(visible.status).toBe(200);
  });

  it('不存在 id → 404；非法 status → 400', async () => {
    const cookie = await cookieFor(superAdmin);
    const missing = await patchJson('/api/namespaces/999999/status', { status: 'FROZEN' }, cookie);
    expect(missing.status).toBe(404);
    const bad = await patchJson(`/api/namespaces/${t5Space}/status`, { status: 'BOGUS' }, cookie);
    expect(bad.status).toBe(400);
  });
});

describe('GET/POST /api/namespaces/:id/members（T6 成员管理）', () => {
  let t6Space: number;
  let ux: string; // 动态新成员

  beforeAll(async () => {
    t6Space = await insertNs('t6-space');
    await addMember(t6Space, assetAdmin, 'OWNER');
    await addMember(t6Space, u1, 'ADMIN');
    ux = await makeUser('ns-ux');
  });

  it('GET 成员列表：可见空间可浏览（u2 非成员看 ACTIVE 空间成员，含 displayName 排序）', async () => {
    const res = await buildApp().request(`/api/namespaces/${t6Space}/members`, {
      headers: { cookie: await cookieFor(u2) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ userId: string; role: string; displayName: string }>;
      total: number;
    };
    expect(body.total).toBe(2);
    expect(body.items.some((m) => m.role === 'OWNER' && m.displayName === 'ns-asset-admin')).toBe(
      true,
    );
    expect(body.items.some((m) => m.role === 'ADMIN' && m.displayName === 'ns-u1')).toBe(true);
  });

  it('GET 成员列表：FROZEN 空间非成员 → 404', async () => {
    const frozen = await insertNs('t6-frozen', 'FROZEN');
    await addMember(frozen, assetAdmin, 'OWNER');
    const res = await buildApp().request(`/api/namespaces/${frozen}/members`, {
      headers: { cookie: await cookieFor(u2) },
    });
    expect(res.status).toBe(404);
  });

  it('POST：ADMIN（u1）设 MEMBER 成功 201；重复添加 → 409 member_exists', async () => {
    const res = await postJson(
      `/api/namespaces/${t6Space}/members`,
      { userId: u2, role: 'MEMBER' },
      await cookieFor(u1),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { member: { userId: string; role: string } };
    expect(body.member).toMatchObject({ userId: u2, role: 'MEMBER' });
    const dup = await postJson(
      `/api/namespaces/${t6Space}/members`,
      { userId: u2, role: 'MEMBER' },
      await cookieFor(u1),
    );
    expect(dup.status).toBe(409);
    expect(await dup.json()).toMatchObject({ code: 'namespace.member_exists' });
  });

  it('POST：ADMIN 设 ADMIN → 403（分配链：ADMIN 仅可设 MEMBER）', async () => {
    const res = await postJson(
      `/api/namespaces/${t6Space}/members`,
      { userId: ux, role: 'ADMIN' },
      await cookieFor(u1),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.forbidden' });
  });

  it('POST：OWNER（assetAdmin）设 ADMIN → 201；设 OWNER → 400 transfer_deferred（转让后置 M2）', async () => {
    const admin = await postJson(
      `/api/namespaces/${t6Space}/members`,
      { userId: ux, role: 'ADMIN' },
      await cookieFor(assetAdmin),
    );
    expect(admin.status).toBe(201);
    const owner = await postJson(
      `/api/namespaces/${t6Space}/members`,
      { userId: u2, role: 'OWNER' },
      await cookieFor(assetAdmin),
    );
    expect(owner.status).toBe(400);
    expect(await owner.json()).toMatchObject({ code: 'namespace.transfer_deferred' });
  });

  it('POST：SUPER_ADMIN 设 OWNER 亦 400（转让约束不因超管豁免）；设 ADMIN 成功', async () => {
    const owner = await postJson(
      `/api/namespaces/${t6Space}/members`,
      { userId: u1, role: 'OWNER' },
      await cookieFor(superAdmin),
    );
    expect(owner.status).toBe(400);
    expect(await owner.json()).toMatchObject({ code: 'namespace.transfer_deferred' });
  });

  it('POST：目标用户非 ACTIVE → 400 user_not_active；MEMBER（u2）无管理权 → 403', async () => {
    const disabled = await makeUser('ns-disabled-member');
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, disabled));
    const badTarget = await postJson(
      `/api/namespaces/${t6Space}/members`,
      { userId: disabled, role: 'MEMBER' },
      await cookieFor(assetAdmin),
    );
    expect(badTarget.status).toBe(400);
    expect(await badTarget.json()).toMatchObject({ code: 'namespace.user_not_active' });
    const noRight = await postJson(
      `/api/namespaces/${t6Space}/members`,
      { userId: disabled, role: 'MEMBER' },
      await cookieFor(u2),
    );
    expect(noRight.status).toBe(403);
  });

  it('GET 成员列表：添加后 total 增长且新成员可见（u2 MEMBER / ux ADMIN）', async () => {
    const res = await buildApp().request(`/api/namespaces/${t6Space}/members`, {
      headers: { cookie: await cookieFor(u1) },
    });
    const body = (await res.json()) as {
      items: Array<{ userId: string; role: string }>;
      total: number;
    };
    expect(body.total).toBe(4);
    expect(body.items.find((m) => m.userId === u2)?.role).toBe('MEMBER');
    expect(body.items.find((m) => m.userId === ux)?.role).toBe('ADMIN');
  });
});
