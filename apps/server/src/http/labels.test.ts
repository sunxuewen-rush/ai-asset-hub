import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, like } from 'drizzle-orm';
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
import { createClient, type Db } from '../db/client.js';
import { asset, assetLabel, auditLog, labelDefinition, user } from '../db/schema/index.js';
import { LabelError } from '../labels/errors.js';
import { pickDisplayName } from '../labels/service.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { createLabelRoutes } from './labels.js';

const PREFIX = 'lbl-';
let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let superAdmin: string;
let ownerId: string;
let audit!: ReturnType<typeof createAuditWriter>;

async function makeUser(tag: string): Promise<string> {
  return createTestUser(db, {
    id: `${PREFIX}${tag}_${randomUUID()}`,
    displayName: `${PREFIX}${tag}`,
  });
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
    if (err instanceof AuthError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    if (err instanceof LabelError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404 | 409);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/labels', createLabelRoutes({ db, audit }));
  return app;
}
const ORIGIN = { origin: 'http://localhost:3000' };
async function req(
  method: string,
  url: string,
  body?: unknown,
  cookie?: string,
  acceptLanguage?: string,
) {
  const headers: Record<string, string> = { host: 'localhost:3000', ...ORIGIN };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  if (acceptLanguage) headers['accept-language'] = acceptLanguage;
  return buildApp().request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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
  auth = createAuth({ ldap: null });
  audit = createAuditWriter(db);
  superAdmin = await makeUser('sa');
  ownerId = await makeUser('owner');
  await setRole(superAdmin, ACCOUNT_ROLE.SUPER_ADMIN);
});

afterAll(async () => {
  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.id, `${PREFIX}%`));
  await db.delete(labelDefinition).where(like(labelDefinition.createdBy, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  for (const _u of users) {
    await cleanupCreatedUsers(db);
  }
  await db.$client.end();
});

describe('label 定义管理（06 §3/§5.2——仅 SUPER_ADMIN）', () => {
  it('超管建一级 label（RECOMMENDED + 翻译）→ 201', async () => {
    const res = await post(
      '/api/labels',
      {
        slug: slug('software'),
        type: 'RECOMMENDED',
        translations: [
          { locale: 'zh', displayName: '软件' },
          { locale: 'en', displayName: 'Software' },
        ],
      },
      await cookieFor(superAdmin),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      slug: string;
      parentId: null;
      translations: Array<{ locale: string }>;
    };
    expect(body.parentId).toBeNull();
    expect(body.translations).toHaveLength(2);
  });

  it('非超管（owner）建 → 403 label.access_denied', async () => {
    const res = await post(
      '/api/labels',
      { slug: slug('denied'), type: 'RECOMMENDED' },
      await cookieFor(ownerId),
    );
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
    const res = await post(
      '/api/labels',
      { slug: child, type: 'RECOMMENDED', parentSlug: parent },
      await cookieFor(superAdmin),
    );
    expect(res.status).toBe(201);
    // 管理面响应 parentId = 父 slug（06 §5.2 对外契约——skillhub LabelDefinitionResponse 对齐 D2）
    expect(((await res.json()) as { parentId: string | null }).parentId).toBe(parent);
  });

  it('锁两级校验矩阵：parent 不存在 404 / 挂二级之下 400 / 自指 400', async () => {
    const parent = slug('lvl1');
    await post('/api/labels', { slug: parent, type: 'RECOMMENDED' }, await cookieFor(superAdmin));
    const child = slug('lvl2');
    await post(
      '/api/labels',
      { slug: child, type: 'RECOMMENDED', parentSlug: parent },
      await cookieFor(superAdmin),
    );
    const sa = await cookieFor(superAdmin);

    const noParent = await post(
      '/api/labels',
      { slug: slug('nop'), type: 'RECOMMENDED', parentSlug: 'ghost-parent' },
      sa,
    );
    expect(noParent.status).toBe(404);
    expect(((await noParent.json()) as { code: string }).code).toBe('label.not_found');

    const nested = await post(
      '/api/labels',
      { slug: slug('nested'), type: 'RECOMMENDED', parentSlug: child },
      sa,
    );
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
    await post(
      '/api/labels',
      { slug: visible, type: 'RECOMMENDED', translations: [{ locale: 'zh', displayName: '可见' }] },
      sa,
    );
    await post('/api/labels', { slug: slug('priv'), type: 'PRIVILEGED' }, sa);
    await post(
      '/api/labels',
      { slug: slug('hidden'), type: 'RECOMMENDED', visibleInFilter: false },
      sa,
    );

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
    await post(
      '/api/labels',
      { slug: frOnly, type: 'RECOMMENDED', translations: [{ locale: 'fr', displayName: 'Seul' }] },
      sa,
    );
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
    await post(
      '/api/labels',
      {
        slug: l,
        type: 'RECOMMENDED',
        translations: [
          { locale: 'zh', displayName: '旧' },
          { locale: 'en', displayName: 'Old' },
        ],
      },
      sa,
    );
    const up = await patch(
      `/api/labels/${l}`,
      { translations: [{ locale: 'zh', displayName: '新' }] },
      sa,
    );
    expect(up.status).toBe(200);
    const body = (await up.json()) as {
      translations: Array<{ locale: string; displayName: string }>;
    };
    expect(body.translations).toHaveLength(1); // en 已移除（整组替换）
    expect(body.translations[0]).toEqual({ locale: 'zh', displayName: '新' });
  });

  it('D4 同批翻译 locale 重复 → 400 label.translation.locale_duplicate（非误报 slug_taken）', async () => {
    const sa = await cookieFor(superAdmin);
    const res = await post(
      '/api/labels',
      {
        slug: slug('d4'),
        type: 'RECOMMENDED',
        translations: [
          { locale: 'zh', displayName: '一' },
          { locale: 'ZH', displayName: '二' },
        ],
      },
      sa,
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe(
      'label.translation.locale_duplicate',
    );
  });

  it('D8 locale 归一：zh_CN 入库转 zh-cn（07 BCP47——_→- 小写）', async () => {
    const sa = await cookieFor(superAdmin);
    const l = slug('d8');
    const res = await post(
      '/api/labels',
      { slug: l, type: 'RECOMMENDED', translations: [{ locale: 'zh_CN', displayName: '中国' }] },
      sa,
    );
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

  it('F218 一级可重挂（06 §5.2 v1.7）：无子级一级 → 二级 200 / 目标是二级 400 / 自身有子级 400', async () => {
    const sa = await cookieFor(superAdmin);
    const top = slug('f218top');
    const other = slug('f218other');
    await post('/api/labels', { slug: top, type: 'RECOMMENDED' }, sa);
    await post('/api/labels', { slug: other, type: 'RECOMMENDED' }, sa);

    // ① 正向：一级 → 挂到另一个一级下（变二级），响应 parentId = 新父 slug
    const reParent = await patch(`/api/labels/${top}`, { parentSlug: other }, sa);
    expect(reParent.status).toBe(200);
    expect(((await reParent.json()) as { parentId: string | null }).parentId).toBe(other);

    // ② 反向：二级可降回一级（parentSlug=null）
    const backToTop = await patch(`/api/labels/${top}`, { parentSlug: null }, sa);
    expect(backToTop.status).toBe(200);
    expect(((await backToTop.json()) as { parentId: string | null }).parentId).toBeNull();

    // ③ 锁两级不变：目标是二级 ⇒ 400 label.invalid_parent
    const child = slug('f218child');
    await post('/api/labels', { slug: child, type: 'RECOMMENDED', parentSlug: other }, sa);
    const toChild = await patch(`/api/labels/${top}`, { parentSlug: child }, sa);
    expect(toChild.status).toBe(400);
    expect(((await toChild.json()) as { code: string }).code).toBe('label.invalid_parent');

    // ④ 自身有子级 ⇒ 400 label.parent.has_children（否则把子级顶到三级/造孤儿）
    await post(
      '/api/labels',
      { slug: slug('f218grand'), type: 'RECOMMENDED', parentSlug: top },
      sa,
    );
    const withChild = await patch(`/api/labels/${top}`, { parentSlug: other }, sa);
    expect(withChild.status).toBe(400);
    expect(((await withChild.json()) as { code: string }).code).toBe('label.parent.has_children');

    // ⑤ 重挂不改挂载/翻译（纯结构变更）—— 冻结「重挂 = 无数据丢失」这一放开理由
    const [row] = await db
      .select({ parentId: labelDefinition.parentId })
      .from(labelDefinition)
      .where(eq(labelDefinition.slug, top));
    expect(row?.parentId).toBeNull();
  });

  it('D1 定义总数上限：直插满 100 → 第 101 个 400 label.definition_limit_exceeded', async () => {
    const sa = await cookieFor(superAdmin);
    // 直插需真实用户（created_by FK）——用 superAdmin；slug like 前缀清理
    const rows = Array.from({ length: 100 }, (_, i) => ({
      slug: `${PREFIX}bulk-${i}`,
      type: 'RECOMMENDED' as const,
      createdBy: superAdmin,
    }));
    await db.insert(labelDefinition).values(rows);
    const res = await post('/api/labels', { slug: slug('d1'), type: 'RECOMMENDED' }, sa);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('label.definition_limit_exceeded');
    await db.delete(labelDefinition).where(like(labelDefinition.slug, `${PREFIX}bulk-%`));
  });
});

describe('管理全量列表（06 §5.2——GET /api/labels/all 仅 SUPER_ADMIN；F29 补覆盖）', () => {
  let adminId: string;
  beforeAll(async () => {
    adminId = await makeUser('admin');
    await setRole(adminId, ACCOUNT_ROLE.ADMIN);
  });

  it('超管 200：先验存在性（刚建定义出现）再验形状（含 translations 数组）', async () => {
    const sa = await cookieFor(superAdmin);
    const mine = slug('all-view');
    expect((await post('/api/labels', { slug: mine, type: 'RECOMMENDED' }, sa)).status).toBe(201);

    const res = await get('/api/labels/all', sa);
    expect(res.status).toBe(200);
    // M4b-6 T4（改动 7）：形态 = `{ items, total, limit }`（原为数组）+ 每条带 `assetCount`
    const body = (await res.json()) as {
      items: Array<{
        slug: string;
        translations: Array<{ locale: string; displayName: string }>;
        assetCount: number;
      }>;
      total: number;
      limit: number;
    };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.total).toBe(body.items.length);
    expect(body.limit).toBe(100);
    const found = body.items.find((l) => l.slug === mine);
    expect(found).toBeDefined();
    expect(Array.isArray(found?.translations)).toBe(true);
    expect(found?.assetCount).toBe(0);
  });

  it('管理档（role=ADMIN）→ 403 label.access_denied（facet 面仅超管，非档位阈值判定）', async () => {
    const res = await get('/api/labels/all', await cookieFor(adminId));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('label.access_denied');
  });

  it('匿名 → 401（requireAuth 前置——未登录不达角色判定）', async () => {
    const res = await get('/api/labels/all');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M4b-6 T4（改动 8）：DELETE 有挂载 ⇒ 400 `label.in_use`
// ─────────────────────────────────────────────────────────────────────────────

describe('删除挂载中的标签（M4b-6 T4）', () => {
  it('有挂载 ⇒ 400 label.in_use；解挂后 ⇒ 204', async () => {
    const sa = await cookieFor(superAdmin);
    const name = slug('inuse');
    expect((await post('/api/labels', { slug: name, type: 'RECOMMENDED' }, sa)).status).toBe(201);

    const [label] = await db
      .select({ id: labelDefinition.id })
      .from(labelDefinition)
      .where(eq(labelDefinition.slug, name));
    const mountOwner = await makeUser('inuse-owner');
    const assetSlug = `${PREFIX}${randomUUID().slice(0, 8)}`;
    const [mountAsset] = await db
      .insert(asset)
      .values({ slug: assetSlug, type: 'skill', ownerId: mountOwner })
      .returning({ id: asset.id });
    await db.insert(assetLabel).values({ assetId: mountAsset!.id, labelId: label!.id });

    const blocked = await del(`/api/labels/${name}`, sa);
    expect(blocked.status).toBe(400);
    expect(((await blocked.json()) as { code: string }).code).toBe('label.in_use');

    // 解挂 ⇒ 可删
    await db
      .delete(assetLabel)
      .where(and(eq(assetLabel.assetId, mountAsset!.id), eq(assetLabel.labelId, label!.id)));
    expect((await del(`/api/labels/${name}`, sa)).status).toBe(204);

    // 清理 fixture 资产（标签已删）
    await db.delete(asset).where(eq(asset.id, mountAsset!.id));
  });

  // F212：`mountCountAny`（任一状态）与 `assetCount`（仅已发布）两口径并存。
  // 只挂 HIDDEN 资产时：显示口径 = 0 而守卫口径 = 1 ⇒ UI 的删除禁用条件/文案必须走 `mountCountAny`，
  // 否则「页面说 0、点删被拒」（`deleteLabel` 注释警告的场景）。
  it('F212：仅挂 HIDDEN 资产 ⇒ assetCount = 0 而 mountCountAny = 1（且删除仍被拒）', async () => {
    const sa = await cookieFor(superAdmin);
    const name = slug('hidden-only');
    expect((await post('/api/labels', { slug: name, type: 'RECOMMENDED' }, sa)).status).toBe(201);
    const [label] = await db
      .select({ id: labelDefinition.id })
      .from(labelDefinition)
      .where(eq(labelDefinition.slug, name));
    const owner = await makeUser('hidden-only-owner');
    const hiddenSlug = `${PREFIX}${randomUUID().slice(0, 8)}`;
    const [hiddenAsset] = await db
      .insert(asset)
      .values({ slug: hiddenSlug, type: 'skill', ownerId: owner, status: 'HIDDEN' })
      .returning({ id: asset.id });
    await db.insert(assetLabel).values({ assetId: hiddenAsset!.id, labelId: label!.id });

    const res = await get('/api/labels/all', sa);
    const body = (await res.json()) as {
      items: Array<{ slug: string; assetCount: number; mountCountAny: number }>;
    };
    const row = body.items.find((l) => l.slug === name);
    expect(row?.assetCount).toBe(0); // 显示口径：仅已发布（与看板同面）
    expect(row?.mountCountAny).toBe(1); // 守卫口径：任一状态
    // 不变量：任一状态挂载数恒 ≥ 已发布挂载数（全表逐行）
    expect(body.items.every((l) => l.mountCountAny >= l.assetCount)).toBe(true);

    // 删除确实被拒（守卫按任一状态）—— 这正是 UI 必须禁用删除钮的原因
    expect((await del(`/api/labels/${name}`, sa)).status).toBe(400);

    await db
      .delete(assetLabel)
      .where(and(eq(assetLabel.assetId, hiddenAsset!.id), eq(assetLabel.labelId, label!.id)));
    expect((await del(`/api/labels/${name}`, sa)).status).toBe(204);
    await db.delete(asset).where(eq(asset.id, hiddenAsset!.id));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F215：displayName 回退链（06 §2.3 永不空显示）—— 精确 → 主语言精确 → **主语言前缀** → en → slug
// ─────────────────────────────────────────────────────────────────────────────

describe('标签显示名回退链（F215 · labels/service.pickDisplayName）', () => {
  const tr = (...pairs: Array<[string, string]>) =>
    pairs.map(([locale, displayName]) => ({ locale, displayName }));

  it('① 请求语言精确命中（`_` / 大小写归一后比较）', () => {
    expect(pickDisplayName(tr(['zh-cn', '中文']), 'zh-CN', 'slug')).toBe('中文');
    expect(pickDisplayName(tr(['zh_cn', '中文']), 'ZH-CN', 'slug')).toBe('中文');
  });

  it('② 主语言精确命中（行内 `zh`）', () => {
    expect(pickDisplayName(tr(['zh', '中文']), 'zh-CN', 'slug')).toBe('中文');
  });

  it('③ 主语言**前缀**回退（行内带地区码/书写系统 · 请求主语言）—— F215 修复点', () => {
    expect(pickDisplayName(tr(['zh-cn', '中文']), 'zh', 'slug')).toBe('中文');
    expect(pickDisplayName(tr(['zh-Hans', '中文']), 'zh-CN', 'slug')).toBe('中文');
  });

  it('④ `en` 回退 → ⑤ `slug` 兜底（永不空显示）', () => {
    expect(pickDisplayName(tr(['en', 'English'], ['fr', 'Français']), 'zh-CN', 'slug')).toBe(
      'English',
    );
    expect(pickDisplayName(tr(['fr', 'Français']), 'zh-CN', 'slug')).toBe('slug');
    expect(pickDisplayName(undefined, 'zh-CN', 'slug')).toBe('slug');
  });

  it('精确优先于前缀（`zh-cn` 与 `zh-hans` 并存时取请求语言那行）', () => {
    expect(pickDisplayName(tr(['zh-hans', '书写系统'], ['zh-cn', '简体']), 'zh-cn', 'slug')).toBe(
      '简体',
    );
  });
});

describe('标签翻译 locale 端到端（F215）', () => {
  it('管理页写入 `zh-CN` ⇒ 落库 `zh-cn` ⇒ 公开面中文请求返回中文名（不再回退英文）', async () => {
    const sa = await cookieFor(superAdmin);
    const name = slug('locale-fallback');
    expect(
      (
        await post(
          '/api/labels',
          {
            slug: name,
            type: 'RECOMMENDED',
            translations: [
              { locale: 'zh-CN', displayName: '中文名' },
              { locale: 'en', displayName: 'English name' },
            ],
          },
          sa,
        )
      ).status,
    ).toBe(201);

    const zh = await get('/api/labels', undefined, 'zh-CN');
    const zhBody = (await zh.json()) as Array<{ slug: string; displayName: string }>;
    expect(zhBody.find((l) => l.slug === name)?.displayName).toBe('中文名');

    const en = await get('/api/labels', undefined, 'en-US');
    const enBody = (await en.json()) as Array<{ slug: string; displayName: string }>;
    expect(enBody.find((l) => l.slug === name)?.displayName).toBe('English name');

    expect((await del(`/api/labels/${name}`, sa)).status).toBe(204);
  });
});
