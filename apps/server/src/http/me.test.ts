/**
 * `/api/me/assets`（M4b-4 T4 · R6 个人面读面）—— 集合语义 / 状态维度 / 分页 / 检索 / 形状。
 *
 * 关键契约（批 design §5.1 R6）：
 * - **owner-only**：集合恒 = 「我名下」（`ownerId` 取会话；**管理档看全站走 M4b-6，不在此面**）
 * - `status` 缺省 = **`'ALL'`**（含三态）· 非法值 400
 * - 形状与公开面 /api/assets **同构**（同一 `assetItem()`：14 字段 + `latest*` 批注入）
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { cleanupCreatedUsers, createTestUser, signInCookie } from '../test-utils/auth-fixture.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { Hono } from 'hono';
import { AssetError } from '../assets/errors.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import { asset, assetVersion } from '../db/schema/index.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { createMeRoutes } from './me.js';

const PREFIX = 'me-';
let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let ownerA: string; // 三条资产（ACTIVE/HIDDEN/ARCHIVED）的 owner
let ownerB: string; // 他人（其资产不得出现在 A 的响应里）

async function makeUser(tag: string): Promise<string> {
  return createTestUser(db, { id: `usr_${randomUUID()}`, displayName: `${PREFIX}${tag}` });
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', officialSessionMiddleware(auth));
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403 | 404);
    }
    if (err instanceof AssetError) {
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/me', createMeRoutes({ db }));
  return app;
}

const ORIGIN = { origin: 'http://localhost:3000', host: 'localhost:3000' };
function getReq(url: string, cookie?: string) {
  const headers: Record<string, string> = { ...ORIGIN };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method: 'GET', headers });
}

interface MeItem {
  id: number;
  slug: string;
  type: string;
  status: string;
  ownerId: string;
  latestVersionId: number | null;
  latestVersion: string | null;
  latestName: string | null;
  latestDescription: string | null;
  ownerDisplayName: string | null;
  downloadCount: number;
  starCount: number;
  starredByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 直插资产 + 一个带投影的 PUBLISHED 版本（令 latest* 非 null），并回填 latestVersionId */
async function seedAsset(slug: string, ownerId: string, status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED') {
  const [row] = await db
    .insert(asset)
    .values({ slug, type: 'skill', ownerId, status })
    .returning({ id: asset.id });
  const [version] = await db
    .insert(assetVersion)
    .values({
      assetId: row!.id,
      version: '1.0.0',
      status: 'PUBLISHED',
      fileCount: 0,
      totalSize: 0,
      parsedMetadataJson: { name: `${slug}-name`, description: `${slug}-desc`, searchText: slug },
    })
    .returning({ id: assetVersion.id });
  await db.update(asset).set({ latestVersionId: version!.id }).where(eq(asset.id, row!.id));
  return row!.id;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });
  ownerA = await makeUser('owner-a');
  ownerB = await makeUser('owner-b');
  // 幂等：清掉本文件历史残留（`me-` 前缀资产 + 其版本），防 slug 唯一冲突
  const stale = (
    await db
      .select({ id: asset.id })
      .from(asset)
      .where(like(asset.slug, `${PREFIX}%`))
  ).map((r) => r.id);
  if (stale.length > 0) {
    await db.delete(assetVersion).where(inArray(assetVersion.assetId, stale));
    await db.delete(asset).where(inArray(asset.id, stale));
  }
  await seedAsset(`${PREFIX}act`, ownerA, 'ACTIVE');
  await seedAsset(`${PREFIX}hid`, ownerA, 'HIDDEN');
  await seedAsset(`${PREFIX}arc`, ownerA, 'ARCHIVED');
  await seedAsset(`${PREFIX}other`, ownerB, 'ACTIVE');
});

afterAll(async () => {
  // FK 序：asset_version → asset（子表无 CASCADE ⇒ 必须先删版本）
  const ids = (
    await db
      .select({ id: asset.id })
      .from(asset)
      .where(inArray(asset.ownerId, [ownerA, ownerB]))
  ).map((r) => r.id);
  if (ids.length > 0) {
    await db.delete(assetVersion).where(inArray(assetVersion.assetId, ids));
    await db.delete(asset).where(inArray(asset.id, ids));
  }
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

async function fetchMine(cookie: string, query = ''): Promise<{ status: number; body: MeItem[] }> {
  const res = await getReq(`/api/me/assets${query}`, cookie);
  const body = (await res.json()) as { items?: MeItem[] };
  return { status: res.status, body: body.items ?? [] };
}

describe('GET /api/me/assets（R6 个人面）', () => {
  it('未登录 ⇒ 401（requireAuth）', async () => {
    expect((await getReq('/api/me/assets')).status).toBe(401);
  });

  it('★ owner-only：只含我名下资产（他人资产不出现）；缺省 status = ALL（三态齐）', async () => {
    const { status, body } = await fetchMine(await signInCookie(auth, ownerA));
    expect(status).toBe(200);
    const slugs = body.map((i) => i.slug).sort();
    expect(slugs).toEqual([`${PREFIX}act`, `${PREFIX}arc`, `${PREFIX}hid`]);
    expect(body.some((i) => i.slug === `${PREFIX}other`)).toBe(false);
    expect(body.map((i) => i.status).sort()).toEqual(['ACTIVE', 'ARCHIVED', 'HIDDEN']);
    expect(body.every((i) => i.ownerId === ownerA)).toBe(true);
  });

  it('T11-f 排序同参：不传 / 非法 ⇒ 现状排序零变化（反证）· 合法档位只改序不改集合', async () => {
    const cookie = await signInCookie(auth, ownerA);
    const baseline = await fetchMine(cookie);
    expect(baseline.status).toBe(200);

    // ① 非法值静默回落（与公开面同一 schema 片段口径）+ ② 不传 ⇒ 现状序（既有 G4–G6 零影响）
    const bogus = await fetchMine(cookie, '?sort=bogus&dir=sideways');
    expect(bogus.status).toBe(200);
    expect(bogus.body.map((i) => i.slug)).toEqual(baseline.body.map((i) => i.slug));

    // ③ 合法档位放行：排序只改「序」，集合与总数不变（本面 fixture 计数同为 0 ⇒ 断言集合不变式）
    for (const q of ['?sort=downloads', '?sort=name&dir=asc', '?sort=author']) {
      const res = await fetchMine(cookie, q);
      expect(res.status).toBe(200);
      expect(res.body.map((i) => i.slug).sort()).toEqual(baseline.body.map((i) => i.slug).sort());
    }
  });

  it('status=HIDDEN ⇒ 只含 HIDDEN；status=ACTIVE ⇒ 只含 ACTIVE', async () => {
    const cookie = await signInCookie(auth, ownerA);
    const hidden = await fetchMine(cookie, '?status=HIDDEN');
    expect(hidden.body.map((i) => i.slug)).toEqual([`${PREFIX}hid`]);
    const active = await fetchMine(cookie, '?status=ACTIVE');
    expect(active.body.map((i) => i.slug)).toEqual([`${PREFIX}act`]);
  });

  it('status=bogus ⇒ 400 request.invalid', async () => {
    const res = await getReq('/api/me/assets?status=bogus', await signInCookie(auth, ownerA));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('request.invalid');
  });

  it('分页：limit/offset 生效且 total 为集合总数（与分页无关）', async () => {
    const cookie = await signInCookie(auth, ownerA);
    const res = await getReq('/api/me/assets?limit=1&offset=1', cookie);
    const body = (await res.json()) as {
      items: MeItem[];
      total: number;
      limit: number;
      offset: number;
    };
    expect(body.items.length).toBe(1);
    expect(body.limit).toBe(1);
    expect(body.offset).toBe(1);
    expect(body.total).toBe(3);
  });

  it('q 检索：命中 slug（含隐藏态条目 —— 本面检索覆盖全状态）', async () => {
    const cookie = await signInCookie(auth, ownerA);
    const { body } = await fetchMine(cookie, '?q=me-hid');
    expect(body.map((i) => i.slug)).toEqual([`${PREFIX}hid`]);
  });

  it('★ 形状与公开面同构（+ `labels` 一处差异）：16 字段齐 + latest*/ownerDisplayName 批注入非 null', async () => {
    const { body } = await fetchMine(await signInCookie(auth, ownerA), '?status=ACTIVE');
    const item = body[0]!;
    expect(Object.keys(item).sort()).toEqual(
      [
        'createdAt',
        'downloadCount',
        'id',
        'labels',
        'latestDescription',
        'latestName',
        'latestVersion',
        'latestVersionId',
        'ownerDisplayName',
        'ownerId',
        'slug',
        'starCount',
        'starredByMe',
        'status',
        'type',
        'updatedAt',
      ].sort(),
    );
    expect(item.latestVersion).toBe('1.0.0');
    expect(item.latestName).toBe(`${PREFIX}act-name`);
    expect(item.ownerDisplayName).toBe(`${PREFIX}owner-a`);
    expect(item.starCount).toBe(0);
    expect(item.starredByMe).toBe(false);
    // M4b-4 T14：个人面**下发**已挂标签（公开列表面不下发 —— 唯一形状差异）
    expect(Array.isArray((item as unknown as { labels: unknown[] }).labels)).toBe(true);
  });
});
