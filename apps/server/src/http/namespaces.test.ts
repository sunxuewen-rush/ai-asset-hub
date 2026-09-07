import { randomUUID } from 'node:crypto';
import { eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { Hono } from 'hono';
import { AuthError } from '../auth/errors.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { createClient, type Db } from '../db/client.js';
import { namespace, namespaceMember, userAccount } from '../db/schema/index.js';
import { rbacContext } from './auth-middleware.js';
import { createNamespaceRoutes } from './namespaces.js';

let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let u1: string; // 成员视角
let u2: string; // 非成员视角

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

async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'ns-test');
  return `aih_session=${sid}`;
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', requireSessionMiddleware());
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
  const nsActive = await insertNs('t2-active-team');
  const nsOpen = await insertNs('t2-open-team');
  const nsFrozen = await insertNs('t2-frozen-team', 'FROZEN');
  const nsArchived = await insertNs('t2-archived-team', 'ARCHIVED');
  const nsGlobal = await insertNs('t2-global', 'ACTIVE', 'GLOBAL');
  await addMember(nsActive, u1, 'MEMBER');
  await addMember(nsFrozen, u1, 'ADMIN');
  await addMember(nsGlobal, u2, 'OWNER');
});

afterAll(async () => {
  const slugs = await db
    .select({ id: namespace.id })
    .from(namespace)
    .where(like(namespace.slug, 't2-%'));
  const ids = slugs.map((s) => s.id);
  if (ids.length > 0) {
    await db.delete(namespaceMember).where(inArray(namespaceMember.namespaceId, ids));
    await db.delete(namespace).where(inArray(namespace.id, ids));
  }
  await db.delete(userAccount).where(eq(userAccount.displayName, 'ns-u1'));
  await db.delete(userAccount).where(eq(userAccount.displayName, 'ns-u2'));
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
