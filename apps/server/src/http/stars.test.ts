/**
 * star 最小集（M4b-4 批 design v1.8 §5.1 ⑧）—— 端点 + 读面 + 幂等 + 权限。
 *
 * 只依赖本文件自造数据（`star-` 前缀用户/资产）；`beforeAll` 各自 `migrate()`（仓内测试口径）。
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import {
  cleanupCreatedUsers,
  createTestUser,
  setUserRole,
  signInCookie,
} from '../test-utils/auth-fixture.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Hono } from 'hono';
import { AssetError } from '../assets/errors.js';
import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { ACCOUNT_ROLE, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import { asset, assetStar } from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import { createAssetRoutes } from './assets.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';

const PREFIX = 'star-';
let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let owner: string; // 资产 owner
let other: string; // 非 owner 登录用户（可收藏，非管理档）
let superAdmin: string; // 超管（非 ACTIVE 读面恒可读 ⇒ 可收藏）
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
let audit!: ReturnType<typeof createAuditWriter>;
let uploadRateLimiter!: InMemoryRateLimiter;

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
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404 | 409);
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  return app;
}

const ORIGIN = { origin: 'http://localhost:3000', host: 'localhost:3000' };
function req(method: string, url: string, cookie?: string) {
  const headers: Record<string, string> = { ...ORIGIN };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method, headers });
}
async function cookieFor(userId: string): Promise<string> {
  return signInCookie(auth, userId);
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'star-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(60_000, 10);
  owner = await makeUser('owner');
  other = await makeUser('other');
  superAdmin = await makeUser('super');
  await setUserRole(db, superAdmin, ACCOUNT_ROLE.SUPER_ADMIN);
  await db.insert(asset).values([
    { slug: `${PREFIX}active`, type: 'skill', ownerId: owner, status: 'ACTIVE' },
    { slug: `${PREFIX}plain`, type: 'mcp', ownerId: owner, status: 'ACTIVE' },
    { slug: `${PREFIX}idle`, type: 'skill', ownerId: owner, status: 'ACTIVE' },
    { slug: `${PREFIX}hidden`, type: 'agent', ownerId: owner, status: 'HIDDEN' },
  ]);
});

afterAll(async () => {
  const ownerIds = [owner, other, superAdmin].filter(Boolean);
  if (ownerIds.length > 0) {
    // asset_star 由 FK CASCADE 随资产清理
    await db.delete(asset).where(inArray(asset.ownerId, ownerIds));
  }
  await cleanupCreatedUsers(db);
  await db.$client.end();
  await rm(storageDir, { recursive: true, force: true });
});

describe('star 最小集（M4b-4 §5.1 ⑧）', () => {
  it('匿名 ⇒ 401（社交动作仍需登录）', async () => {
    expect((await req('PUT', `/api/assets/${PREFIX}active/star`)).status).toBe(401);
    expect((await req('DELETE', `/api/assets/${PREFIX}active/star`)).status).toBe(401);
  });

  it('幂等：连两次 PUT ⇒ 计数只 +1；连两次 DELETE ⇒ 回基线', async () => {
    const cookie = await cookieFor(owner);
    const first = await req('PUT', `/api/assets/${PREFIX}active/star`, cookie);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ starCount: 1, starred: true });

    const again = await req('PUT', `/api/assets/${PREFIX}active/star`, cookie);
    expect(await again.json()).toEqual({ starCount: 1, starred: true });

    // 关系行唯一（结构保证）
    const rows = await db
      .select({ id: assetStar.id })
      .from(assetStar)
      .innerJoin(asset, eq(asset.id, assetStar.assetId))
      .where(eq(asset.slug, `${PREFIX}active`));
    expect(rows.length).toBe(1);

    const off1 = await req('DELETE', `/api/assets/${PREFIX}active/star`, cookie);
    expect(await off1.json()).toEqual({ starCount: 0, starred: false });
    const off2 = await req('DELETE', `/api/assets/${PREFIX}active/star`, cookie);
    expect(await off2.json()).toEqual({ starCount: 0, starred: false });
  });

  it('非 owner 登录用户可收藏（不受 canManageAsset 约束）⇒ 计数累加', async () => {
    const ownerCookie = await cookieFor(owner);
    const otherCookie = await cookieFor(other);
    await req('PUT', `/api/assets/${PREFIX}plain/star`, ownerCookie);
    const res = await req('PUT', `/api/assets/${PREFIX}plain/star`, otherCookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ starCount: 2, starred: true });
  });

  it('starredByMe：本人 true / 他人 false（而计数含他人）/ 匿名 false', async () => {
    const ownerCookie = await cookieFor(owner);
    const otherCookie = await cookieFor(other);

    const asOwner = (await (
      await req('GET', `/api/assets/${PREFIX}plain`, ownerCookie)
    ).json()) as {
      starCount: number;
      starredByMe: boolean;
    };
    expect(asOwner.starredByMe).toBe(true);
    expect(asOwner.starCount).toBe(2);

    // other 未收藏 active ⇒ starredByMe=false，但计数仍是 1（owner 收藏）
    await req('PUT', `/api/assets/${PREFIX}active/star`, ownerCookie);
    const asOther = (await (
      await req('GET', `/api/assets/${PREFIX}active`, otherCookie)
    ).json()) as {
      starCount: number;
      starredByMe: boolean;
    };
    expect(asOther.starredByMe).toBe(false);
    expect(asOther.starCount).toBe(1);

    const anon = (await (await req('GET', `/api/assets/${PREFIX}active`)).json()) as {
      starCount: number;
      starredByMe: boolean;
    };
    expect(anon.starredByMe).toBe(false);
    expect(anon.starCount).toBe(1);
  });

  it('非 ACTIVE：star 与读面**同源守卫**（授权集外 404 · 匿名 401 · 超管恒可读）', async () => {
    const otherCookie = await cookieFor(other);
    const ownerCookie = await cookieFor(owner);
    // 关键不变量：star 端点状态 === 详情读面状态（R6-b 扩面后仍成立 ⇒ 断言不会被上游改进打破）
    for (const cookie of [otherCookie, ownerCookie]) {
      const detail = await req('GET', `/api/assets/${PREFIX}hidden`, cookie);
      const star = await req('PUT', `/api/assets/${PREFIX}hidden/star`, cookie);
      expect(star.status).toBe(detail.status);
    }
    expect((await req('PUT', `/api/assets/${PREFIX}hidden/star`, otherCookie)).status).toBe(404);
    expect(
      (await req('PUT', `/api/assets/${PREFIX}hidden/star`, 'aih.session_token=bogus')).status,
    ).toBe(401);
    const superCookie = await cookieFor(superAdmin);
    const ok = await req('PUT', `/api/assets/${PREFIX}hidden/star`, superCookie);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ starCount: 1, starred: true });
    await req('DELETE', `/api/assets/${PREFIX}hidden/star`, superCookie);
  });

  it('列表读面：starCount 恒有 · starredByMe 随身份（一次批量查询）', async () => {
    const anon = (await (await req('GET', '/api/assets')).json()) as {
      items: Array<{ slug: string; starCount: number; starredByMe: boolean }>;
    };
    const anonItem = anon.items.find((i) => i.slug === `${PREFIX}plain`)!;
    expect(anonItem.starCount).toBe(2);
    expect(anonItem.starredByMe).toBe(false);

    const ownerCookie = await cookieFor(owner);
    const mine = (await (await req('GET', '/api/assets', ownerCookie)).json()) as {
      items: Array<{ slug: string; starCount: number; starredByMe: boolean }>;
    };
    const mineItem = mine.items.find((i) => i.slug === `${PREFIX}plain`)!;
    expect(mineItem.starredByMe).toBe(true);
    // 他人收藏的同一条：owner 也收藏了 ⇒ true；未收藏的 active 在 owner 视角成立、other 视角不成立
    const otherCookie = await cookieFor(other);
    const otherView = (await (await req('GET', '/api/assets', otherCookie)).json()) as {
      items: Array<{ slug: string; starCount: number; starredByMe: boolean }>;
    };
    const activeForOther = otherView.items.find((i) => i.slug === `${PREFIX}active`)!;
    expect(activeForOther.starredByMe).toBe(false);
    expect(activeForOther.starCount).toBe(1);
  });

  it('已收藏 ⇒ DELETE 生效；随后再 DELETE 幂等不变', async () => {
    const cookie = await cookieFor(other);
    const off = await req('DELETE', `/api/assets/${PREFIX}plain/star`, cookie);
    expect(await off.json()).toEqual({ starCount: 1, starred: false });
    const again = await req('DELETE', `/api/assets/${PREFIX}plain/star`, cookie);
    expect(await again.json()).toEqual({ starCount: 1, starred: false });
  });

  it('从未收藏的资产 ⇒ DELETE 幂等且计数不变（下界兜底 greatest(...,0)）', async () => {
    const cookie = await cookieFor(other);
    const first = await req('DELETE', `/api/assets/${PREFIX}idle/star`, cookie);
    expect(await first.json()).toEqual({ starCount: 0, starred: false });
    const second = await req('DELETE', `/api/assets/${PREFIX}idle/star`, cookie);
    expect(await second.json()).toEqual({ starCount: 0, starred: false });
    const [row] = await db
      .select({ starCount: asset.starCount })
      .from(asset)
      .where(eq(asset.slug, `${PREFIX}idle`));
    expect(row!.starCount).toBe(0);
  });
});

describe('star 计数与关系一致性', () => {
  it('计数 = 关系行数（冗余列不漂移）', async () => {
    const rows = await db
      .select({ id: asset.id, starCount: asset.starCount, slug: asset.slug })
      .from(asset)
      .where(and(eq(asset.ownerId, owner), inArray(asset.slug, [`${PREFIX}plain`])));
    const target = rows[0]!;
    const relations = await db
      .select({ id: assetStar.id })
      .from(assetStar)
      .where(eq(assetStar.assetId, target.id));
    expect(target.starCount).toBe(relations.length);
  });
});
