import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createAuditWriter } from '../audit/audit.js';
import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import { auditLog, labelDefinition, role, userAccount, userRoleBinding, type RoleCode } from '../db/schema/index.js';
import { LabelError } from '../labels/errors.js';
import { rbacContext } from './auth-middleware.js';
import { createLabelRoutes } from './labels.js';

const PREFIX = 'lbl-';
let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let superAdmin: string;
let ownerId: string;
let audit!: ReturnType<typeof createAuditWriter>;

async function makeUser(tag: string): Promise<string> {
  const id = `${PREFIX}${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}
async function ensureRole(code: RoleCode) {
  await db.insert(role).values({ code, name: `r-${code}`, isSystem: true }).onConflictDoNothing();
}
async function bindRole(userId: string, code: RoleCode) {
  const rows = await db.select().from(role).where(eq(role.code, code));
  await db.insert(userRoleBinding).values({ userId, roleId: rows[0]!.id });
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'lbl-http');
  return `aih_session=${sid}`;
}
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
  app.onError((err, c) => {
    if (err instanceof AuthError) return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    if (err instanceof LabelError) return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404 | 409);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/labels', createLabelRoutes({ db, audit }));
  return app;
}
const ORIGIN = { origin: 'http://localhost:3000' };
async function req(method: string, url: string, body?: unknown, cookie?: string, acceptLanguage?: string) {
  const headers: Record<string, string> = { host: 'localhost:3000', ...ORIGIN };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  if (acceptLanguage) headers['accept-language'] = acceptLanguage;
  return buildApp().request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const post = (u: string, b: unknown, c?: string) => req('POST', u, b, c);
const get = (u: string, c?: string, al?: string) => req('GET', u, undefined, c, al);
const patch = (u: string, b: unknown, c: string) => req('PATCH', u, b, c);
const del = (u: string, c: string) => req('DELETE', u, undefined, c);

let seq = 0;
const slug = (tag: string) => `${tag}-${++seq}`;

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  audit = createAuditWriter(db);
  superAdmin = await makeUser('sa');
  ownerId = await makeUser('owner');
  await ensureRole('SUPER_ADMIN');
  await bindRole(superAdmin, 'SUPER_ADMIN');
});

afterAll(async () => {
  const users = await db.select({ id: userAccount.id }).from(userAccount).where(like(userAccount.id, `${PREFIX}%`));
  await db.delete(labelDefinition).where(like(labelDefinition.createdBy, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  for (const u of users) {
    await db.delete(userRoleBinding).where(eq(userRoleBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

describe('label 定义管理（06 §3/§5.2——仅 SUPER_ADMIN）', () => {
  it('超管建一级 label（RECOMMENDED + 翻译）→ 201', async () => {
    const res = await post('/api/labels', { slug: slug('software'), type: 'RECOMMENDED', translations: [{ locale: 'zh', displayName: '软件' }, { locale: 'en', displayName: 'Software' }] }, await cookieFor(superAdmin));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { slug: string; parentId: null; translations: Array<{ locale: string }> };
    expect(body.parentId).toBeNull();
    expect(body.translations).toHaveLength(2);
  });

  it('非超管（owner）建 → 403 label.access_denied', async () => {
    const res = await post('/api/labels', { slug: slug('denied'), type: 'RECOMMENDED' }, await cookieFor(ownerId));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('label.access_denied');
  });

  it('匿名建 → 401', async () => {
    const res = await post('/api/labels', { slug: slug('anon'), type: 'RECOMMENDED' });
    expect(res.status).toBe(401);
  });

  it('二级挂一级（parent slug 解析 + 响应 parentId 回 slug）→ 201', async () => {
    const parent = slug('tech');
    await post('/api/labels', { slug: parent, type: 'RECOMMENDED' }, await cookieFor(superAdmin));
    const child = slug('comm');
    const res = await post('/api/labels', { slug: child, type: 'RECOMMENDED', parentSlug: parent }, await cookieFor(superAdmin));
    expect(res.status).toBe(201);
    // 管理面响应 parentId = 父 slug（06 §5.2 对外契约——skillhub LabelDefinitionResponse 对齐 D2）
    expect(((await res.json()) as { parentId: string | null }).parentId).toBe(parent);
  });

  it('锁两级校验矩阵：parent 不存在 404 / 挂二级之下 400 / 自指 400', async () => {
    const parent = slug('lvl1');
    await post('/api/labels', { slug: parent, type: 'RECOMMENDED' }, await cookieFor(superAdmin));
    const child = slug('lvl2');
    await post('/api/labels', { slug: child, type: 'RECOMMENDED', parentSlug: parent }, await cookieFor(superAdmin));
    const sa = await cookieFor(superAdmin);

    const noParent = await post('/api/labels', { slug: slug('nop'), type: 'RECOMMENDED', parentSlug: 'ghost-parent' }, sa);
    expect(noParent.status).toBe(404);
    expect(((await noParent.json()) as { code: string }).code).toBe('label.not_found');

    const nested = await post('/api/labels', { slug: slug('nested'), type: 'RECOMMENDED', parentSlug: child }, sa);
    expect(nested.status).toBe(400);
    expect(((await nested.json()) as { code: string }).code).toBe('label.invalid_parent');

    const self = await patch(`/api/labels/${parent}`, { parentSlug: parent }, sa);
    expect(self.status).toBe(400);
    expect(((await self.json()) as { code: string }).code).toBe('label.invalid_parent');
  });

  it('slug 冲突 → 409 label.slug_taken', async () => {
    const dup = slug('dup');
    const sa = await cookieFor(superAdmin);
    await post('/api/labels', { slug: dup, type: 'RECOMMENDED' }, sa);
    const res = await post('/api/labels', { slug: dup, type: 'PRIVILEGED' }, sa);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('label.slug_taken');
  });

  it('删除带子级一级 → 400 has_children；删二级（级联挂载）→ 204', async () => {
    const parent = slug('tree');
    const sa = await cookieFor(superAdmin);
    await post('/api/labels', { slug: parent, type: 'RECOMMENDED' }, sa);
    const child = slug('leaf');
    await post('/api/labels', { slug: child, type: 'RECOMMENDED', parentSlug: parent }, sa);

    const blocked = await del(`/api/labels/${parent}`, sa);
    expect(blocked.status).toBe(400);
    expect(((await blocked.json()) as { code: string }).code).toBe('label.parent.has_children');

    const ok = await del(`/api/labels/${child}`, sa);
    expect(ok.status).toBe(204);
    const parentOk = await del(`/api/labels/${parent}`, sa);
    expect(parentOk.status).toBe(204);
  });
});

describe('公开列表（06 §5.1——RECOMMENDED + visible_in_filter + displayName 回退）', () => {
  it('只含 RECOMMENDED 可见项；PRIVILEGED/隐藏不混入', async () => {
    const sa = await cookieFor(superAdmin);
    const visible = slug('visible');
    await post('/api/labels', { slug: visible, type: 'RECOMMENDED', translations: [{ locale: 'zh', displayName: '可见' }] }, sa);
    await post('/api/labels', { slug: slug('priv'), type: 'PRIVILEGED' }, sa);
    await post('/api/labels', { slug: slug('hidden'), type: 'RECOMMENDED', visibleInFilter: false }, sa);

    const res = await get('/api/labels', undefined, 'zh-CN,zh;q=0.9');
    expect(res.status).toBe(200);
    const items = (await res.json()) as Array<{ slug: string; displayName: string }>;
    const slugs = items.map((i) => i.slug);
    expect(slugs).toContain(visible);
    expect(slugs).not.toContain(slug('priv')); // PRIVILEGED 不混入
    const hit = items.find((i) => i.slug === visible);
    expect(hit!.displayName).toBe('可见'); // zh 命中
  });

  it('displayName 回退：无 locale 命中 → slug 兜底永不空', async () => {
    const sa = await cookieFor(superAdmin);
    const bare = slug('bare');
    await post('/api/labels', { slug: bare, type: 'RECOMMENDED' }, sa);
    const res = await get('/api/labels');
    const items = (await res.json()) as Array<{ slug: string; displayName: string }>;
    const hit = items.find((i) => i.slug === bare);
    expect(hit!.displayName).toBe(bare);
  });

  it('D5 对标：无 zh/en 翻译时 fr 请求 → slug 兜底（不显示随机首翻译）', async () => {
    const sa = await cookieFor(superAdmin);
    const frOnly = slug('fr-only');
    await post('/api/labels', { slug: frOnly, type: 'RECOMMENDED', translations: [{ locale: 'fr', displayName: 'Seul' }] }, sa);
    const res = await get('/api/labels', undefined, 'fr-FR');
    const items = (await res.json()) as Array<{ slug: string; displayName: string }>;
    const hit = items.find((i) => i.slug === frOnly);
    expect(hit!.displayName).toBe('Seul'); // fr 精确命中
    const resEn = await get('/api/labels', undefined, 'en-US');
    const itemsEn = (await resEn.json()) as Array<{ slug: string; displayName: string }>;
    const hitEn = itemsEn.find((i) => i.slug === frOnly);
    expect(hitEn!.displayName).toBe(frOnly); // en 未命中 → slug（不落首翻译 fr）
  });
});

describe('对标 skillhub 修正（D1-D8——源码实证回写）', () => {
  it('D3 翻译整组替换：PATCH 提供新组 → 未列 locale 被移除', async () => {
    const sa = await cookieFor(superAdmin);
    const l = slug('d3');
    await post('/api/labels', { slug: l, type: 'RECOMMENDED', translations: [{ locale: 'zh', displayName: '旧' }, { locale: 'en', displayName: 'Old' }] }, sa);
    const up = await patch(`/api/labels/${l}`, { translations: [{ locale: 'zh', displayName: '新' }] }, sa);
    expect(up.status).toBe(200);
    const body = (await up.json()) as { translations: Array<{ locale: string; displayName: string }> };
    expect(body.translations).toHaveLength(1); // en 已移除（整组替换）
    expect(body.translations[0]).toEqual({ locale: 'zh', displayName: '新' });
  });

  it('D4 同批翻译 locale 重复 → 400 label.translation.locale_duplicate（非误报 slug_taken）', async () => {
    const sa = await cookieFor(superAdmin);
    const res = await post('/api/labels', { slug: slug('d4'), type: 'RECOMMENDED', translations: [{ locale: 'zh', displayName: '一' }, { locale: 'ZH', displayName: '二' }] }, sa);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('label.translation.locale_duplicate');
  });

  it('D8 locale 归一：zh_CN 入库转 zh-cn（07 BCP47——_→- 小写）', async () => {
    const sa = await cookieFor(superAdmin);
    const l = slug('d8');
    const res = await post('/api/labels', { slug: l, type: 'RECOMMENDED', translations: [{ locale: 'zh_CN', displayName: '中国' }] }, sa);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { translations: Array<{ locale: string }> };
    expect(body.translations[0]!.locale).toBe('zh-cn');
  });

  it('D2 管理面 PATCH 换域响应 parentId = 新父 slug', async () => {
    const sa = await cookieFor(superAdmin);
    const p1 = slug('d2p1');
    const p2 = slug('d2p2');
    await post('/api/labels', { slug: p1, type: 'RECOMMENDED' }, sa);
    await post('/api/labels', { slug: p2, type: 'RECOMMENDED' }, sa);
    const child = slug('d2c');
    await post('/api/labels', { slug: child, type: 'RECOMMENDED', parentSlug: p1 }, sa);
    const up = await patch(`/api/labels/${child}`, { parentSlug: p2 }, sa);
    expect(up.status).toBe(200);
    expect(((await up.json()) as { parentId: string | null }).parentId).toBe(p2);
  });

  it('D1 定义总数上限：直插满 100 → 第 101 个 400 label.definition_limit_exceeded', async () => {
    const sa = await cookieFor(superAdmin);
    // 直插需真实用户（created_by FK）——用 superAdmin；slug like 前缀清理
    const rows = Array.from({ length: 100 }, (_, i) => ({ slug: `${PREFIX}bulk-${i}`, type: 'RECOMMENDED' as const, createdBy: superAdmin }));
    await db.insert(labelDefinition).values(rows);
    const res = await post('/api/labels', { slug: slug('d1'), type: 'RECOMMENDED' }, sa);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('label.definition_limit_exceeded');
    await db.delete(labelDefinition).where(like(labelDefinition.slug, `${PREFIX}bulk-%`));
  });
});
