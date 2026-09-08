import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { Hono } from 'hono';
import { AssetError } from '../assets/errors.js';
import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import {
  asset,
  namespace,
  namespaceMember,
  role,
  userAccount,
  userRoleBinding,
  type AssetType,
  type RoleCode,
} from '../db/schema/index.js';
import { rbacContext } from './auth-middleware.js';
import { createAssetRoutes } from './assets.js';

const PREFIX = 'ast-';
let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let member: string; // ns-a MEMBER（有 asset:publish）
let owner2: string; // ns-b owner（另一坐标空间）
let outsider: string; // 无成员关系
let assetAdmin: string; // ns-a ADMIN
let superAdmin: string;
let nsA: number;
let nsArch: number;

async function makeUser(tag: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}
async function insertNs(slug: string, status: 'ACTIVE' | 'FROZEN' | 'ARCHIVED' = 'ACTIVE'): Promise<number> {
  const rows = await db
    .insert(namespace)
    .values({ slug, displayName: `${PREFIX}${slug}`, type: 'TEAM', status })
    .returning({ id: namespace.id });
  return rows[0]!.id;
}
async function addMember(ns: number, userId: string, roleName: 'OWNER' | 'ADMIN' | 'MEMBER') {
  await db.insert(namespaceMember).values({ namespaceId: ns, userId, role: roleName });
}
async function ensureRole(roleCode: RoleCode) {
  await db.insert(role).values({ code: roleCode, name: `r-${roleCode}`, isSystem: true }).onConflictDoNothing();
}
async function bindRole(userId: string, roleCode: RoleCode) {
  const rows = await db.select().from(role).where(eq(role.code, roleCode));
  await db.insert(userRoleBinding).values({ userId, roleId: rows[0]!.id });
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'ast-http');
  return `aih_session=${sid}`;
}
/** 直插资产（可见性矩阵 seed；走服务层注册会重复测——此处为读面预置数据） */
async function insertAsset(slug: string, type: AssetType, ownerId: string, visibility: string, nsIdArg = nsA, status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED' = 'ACTIVE') {
  await db
    .insert(asset)
    .values({ namespaceId: nsIdArg, slug, type, ownerId, visibility: visibility as never, status })
    .returning({ id: asset.id });
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403 | 404 | 409 | 413);
    }
    if (err instanceof AssetError) {
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 404 | 409 | 413);
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db }));
  return app;
}

const ORIGIN = { origin: 'http://localhost:3000' };
function jsonRequest(method: string, url: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...ORIGIN, host: 'localhost:3000' };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method, headers, body: JSON.stringify(body) });
}
function getReq(url: string, cookie?: string) {
  const headers: Record<string, string> = { host: 'localhost:3000' };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method: 'GET', headers });
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  member = await makeUser('member');
  owner2 = await makeUser('owner2');
  outsider = await makeUser('outsider');
  await ensureRole('ASSET_ADMIN');
  await ensureRole('SUPER_ADMIN');
  assetAdmin = await makeUser('asset-admin');
  superAdmin = await makeUser('super-admin');
  await bindRole(assetAdmin, 'ASSET_ADMIN');
  await bindRole(superAdmin, 'SUPER_ADMIN');
  nsA = await insertNs('ast-http-ns');
  await insertNs('ast-http-frozen', 'FROZEN');
  const nsB = await insertNs('ast-http-nsb');
  nsArch = await insertNs('ast-http-arch', 'ARCHIVED');
  await addMember(nsA, member, 'MEMBER');
  await addMember(nsA, assetAdmin, 'ADMIN');
  await addMember(nsB, owner2, 'OWNER');
  await addMember(nsB, member, 'MEMBER');
  // 读面 seed：PUBLIC skill（member 传）/ PRIVATE mcp（member 传）/ HIDDEN / archived 空间 PUBLIC
  await insertAsset('ast-pub-skill', 'skill', member, 'PUBLIC');
  await insertAsset('ast-priv-mcp', 'mcp', member, 'PRIVATE');
  await insertAsset('ast-hidden', 'agent', member, 'PUBLIC', nsA, 'HIDDEN');
  await insertAsset('ast-arch-ns-pub', 'skill', member, 'PUBLIC', nsArch);
});

afterAll(async () => {
  const nsRows = await db.select({ id: namespace.id }).from(namespace).where(like(namespace.slug, `${PREFIX}%`));
  const ids = nsRows.map((n) => n.id);
  if (ids.length > 0) {
    await db.delete(asset).where(inArray(asset.namespaceId, ids));
    await db.delete(namespaceMember).where(inArray(namespaceMember.namespaceId, ids));
    await db.delete(namespace).where(inArray(namespace.id, ids));
  }
  // FK 序：role_binding → user（前缀用户含 asset-admin/super-admin 的绑定）
  const users = await db.select({ id: userAccount.id }).from(userAccount).where(like(userAccount.displayName, `${PREFIX}%`));
  const userIds = users.map((u) => u.id);
  if (userIds.length > 0) {
    await db.delete(userRoleBinding).where(inArray(userRoleBinding.userId, userIds));
  }
  await db.delete(userAccount).where(like(userAccount.displayName, `${PREFIX}%`));
  await db.$client.end();
});

describe('POST /api/assets 注册', () => {
  it('MEMBER 注册 201：owner/visibility 默认 PUBLIC 落位', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { namespaceSlug: 'ast-http-ns', slug: 'ast-new-skill', type: 'skill' },
      await cookieFor(member),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.slug).toBe('ast-new-skill');
    expect(body.type).toBe('skill');
    expect(body.visibility).toBe('PUBLIC');
    expect(body.ownerId).toBe(member);
    expect(body.status).toBe('ACTIVE');
  });

  it('slug 冲突 409（跨类型唯一）', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { namespaceSlug: 'ast-http-ns', slug: 'ast-pub-skill', type: 'agent' },
      await cookieFor(member),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.slug_taken');
  });

  it('非空间成员 403（asset:publish 需成员——05 §6.4）', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { namespaceSlug: 'ast-http-ns', slug: 'ast-x', type: 'skill' },
      await cookieFor(outsider),
    );
    expect(res.status).toBe(403);
  });

  it('FROZEN 空间拒写 403（rbac.can 判定链）', async () => {
    // member 非 ast-http-frozen 成员 → 403（FROZEN 与成员双拒路径合并验证）
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { namespaceSlug: 'ast-http-frozen', slug: 'ast-x', type: 'skill' },
      await cookieFor(member),
    );
    expect(res.status).toBe(403);
  });

  it('namespace 不存在 404', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { namespaceSlug: 'ast-no-ns', slug: 'ast-x', type: 'skill' },
      await cookieFor(member),
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.namespace_not_found');
  });

  it('body 非法 400（slug 大写）', async () => {
    const res = await jsonRequest(
      'POST',
      '/api/assets',
      { namespaceSlug: 'ast-http-ns', slug: 'Bad-Slug', type: 'skill' },
      await cookieFor(member),
    );
    expect(res.status).toBe(400);
  });

  it('未登录 401', async () => {
    const res = await jsonRequest('POST', '/api/assets', { namespaceSlug: 'ast-http-ns', slug: 'ast-x', type: 'skill' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/assets/{ns}/{slug} 详情（可见性——skillhub 对齐分层）', () => {
  it('PUBLIC 匿名 200', async () => {
    const res = await getReq('/api/assets/ast-http-ns/ast-pub-skill');
    expect(res.status).toBe(200);
  });

  it('PRIVATE 匿名 403（存在但无权——access_denied）', async () => {
    const res = await getReq('/api/assets/ast-http-ns/ast-priv-mcp');
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.access_denied');
  });

  it('PRIVATE owner 200', async () => {
    const res = await getReq('/api/assets/ast-http-ns/ast-priv-mcp', await cookieFor(member));
    expect(res.status).toBe(200);
  });

  it('PRIVATE 非 owner 非成员 403（access_denied）', async () => {
    const res = await getReq('/api/assets/ast-http-ns/ast-priv-mcp', await cookieFor(outsider));
    expect(res.status).toBe(403);
  });

  it('PRIVATE 空间 ADMIN 200（05 §6.5 管理面）', async () => {
    const res = await getReq('/api/assets/ast-http-ns/ast-priv-mcp', await cookieFor(assetAdmin));
    expect(res.status).toBe(200);
  });

  it('坐标不存在 404（ns 不存在 / slug 不存在）', async () => {
    expect((await getReq('/api/assets/ast-http-ns/ast-no-such')).status).toBe(404);
    expect((await getReq('/api/assets/ast-no-ns/ast-pub-skill')).status).toBe(404);
  });

  it('HIDDEN 资产：登录用户 404（活跃面不存在）；SUPER_ADMIN 200', async () => {
    expect((await getReq('/api/assets/ast-http-ns/ast-hidden', await cookieFor(member))).status).toBe(404);
    expect((await getReq('/api/assets/ast-http-ns/ast-hidden', await cookieFor(superAdmin))).status).toBe(200);
  });

  it('ns ARCHIVED 且非成员：403 namespace_archived（明示空间归档）', async () => {
    const res = await getReq('/api/assets/ast-http-arch/ast-arch-ns-pub', await cookieFor(outsider));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('asset.namespace_archived');
  });

  it('ns ARCHIVED：SUPER_ADMIN 可见', async () => {
    const res = await getReq('/api/assets/ast-http-arch/ast-arch-ns-pub', await cookieFor(superAdmin));
    expect(res.status).toBe(200);
  });

  it('PRIVATE SUPER_ADMIN 可见（短路）', async () => {
    const res = await getReq('/api/assets/ast-http-ns/ast-priv-mcp', await cookieFor(superAdmin));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/assets 列表（读面过滤）', () => {
  it('匿名 401（列表需登录；详情才匿名）', async () => {
    const res = await getReq('/api/assets');
    expect(res.status).toBe(401);
  });

  it('MEMBER：PUBLIC + 自己 PRIVATE 可见；他人 PRIVATE 不可见', async () => {
    const res = await getReq('/api/assets?nsSlug=ast-http-ns', await cookieFor(member));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    const slugs = body.items.map((i) => i.slug);
    expect(slugs).toContain('ast-pub-skill'); // PUBLIC
    expect(slugs).toContain('ast-priv-mcp'); // 自己是 owner
    expect(slugs).toContain('ast-new-skill'); // 注册用例产物 PUBLIC
  });

  it('outsider（非成员）：PUBLIC 可见、PRIVATE 不可见', async () => {
    const res = await getReq('/api/assets?nsSlug=ast-http-ns', await cookieFor(outsider));
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    const slugs = body.items.map((i) => i.slug);
    expect(slugs).toContain('ast-pub-skill');
    expect(slugs).not.toContain('ast-priv-mcp');
  });

  it('type 过滤', async () => {
    const res = await getReq('/api/assets?type=mcp', await cookieFor(member));
    const body = (await res.json()) as { items: Array<{ slug: string }> };
    expect(body.items.every((i) => i.slug.startsWith('ast-'))).toBe(true);
    expect(body.items.filter((i) => i.slug === 'ast-priv-mcp').length).toBeGreaterThanOrEqual(1);
  });
});
