/**
 * `POST /api/assets/:slug/versions/:version/yank` —— **HTTP 路由层**契约（M4b-4 T12 覆盖补测）。
 *
 * 为什么补：服务层 `assets/yank.ts` 已 100% 覆盖（见 `assets/yank.test.ts`），但**路由层**
 * （`http/assets.ts:683-713`）此前零覆盖，而 M4b-4 T12 把它接成了「撤回分发」的**唯一 UI 入口**
 * ⇒ 「UI → 端点」这条链缺实证。本文件补的是**路由组合语义**：
 *   ① 鉴权矩阵（匿名 401 / 普通用户 403 / 管理档 200 / 超管 200）
 *   ② 入参校验（reason 缺失·空白 ⇒ 400）
 *   ③ 状态门（非 PUBLISHED ⇒ 400；**已 YANKED 重复 yank ⇒ 400，非幂等——明示契约**）
 *   ④ 坐标解析（资产/版本不存在、版本形态非法 ⇒ 404）
 *   ⑤ `latest` 重算值**透出**（`{ status, latestVersionId }` 响应体）
 *   ⑥ token 通道 scope 交集（`asset:manage`）
 *
 * 纪律（仓内测试口径）：只依赖本文件自造数据（`ynk-rt-` 前缀）· `beforeAll` 各自 `migrate()` ·
 * env 一律 `??=` 兜底（不无条件改写 `process.env`）。
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { AssetError } from '../assets/errors.js';
import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { ACCOUNT_ROLE, type AccountRole, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import { asset, assetVersion, auditLog } from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import {
  cleanupCreatedUsers,
  createTestUser,
  mintApiKey,
  setUserRole,
  signInCookie,
} from '../test-utils/auth-fixture.js';
import { createAssetRoutes } from './assets.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { tokenAuthMiddleware } from './token-middleware.js';

const PREFIX = 'ynk-rt-';
const ORIGIN = { host: 'localhost:3000', origin: 'http://localhost:3000' };

let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
let audit!: ReturnType<typeof createAuditWriter>;
let uploadRateLimiter!: InMemoryRateLimiter;

let owner: string; // 普通用户（USER）——**即使是资产 owner 也无 yank 权**
let admin: string; // 管理档（ADMIN）——yank 门槛
let superAdmin: string; // 超管（SUPER_ADMIN）

async function makeUser(tag: string): Promise<string> {
  return createTestUser(db, { id: `usr_${randomUUID()}`, displayName: `${PREFIX}${tag}` });
}
async function setRole(userId: string, role: AccountRole): Promise<void> {
  await setUserRole(db, userId, role);
}
async function cookieFor(userId: string): Promise<string> {
  return signInCookie(auth, userId);
}

/** 造「资产 + 单版本」，并可选把 `latestVersionId` 指向该版本 */
async function seed(
  tag: string,
  versionStatus: 'PUBLISHED' | 'DRAFT' | 'YANKED',
  opts: { pointLatest?: boolean; ownerId?: string } = {},
): Promise<{ slug: string; assetId: number; versionId: number }> {
  const slug = `${PREFIX}${tag}-${randomUUID().slice(0, 8)}`;
  const ownerId = opts.ownerId ?? owner;
  const [a] = await db
    .insert(asset)
    .values({ slug, type: 'skill', ownerId, status: 'ACTIVE' })
    .returning({ id: asset.id });
  const assetId = a!.id;
  const [v] = await db
    .insert(assetVersion)
    .values({
      assetId,
      version: '1.0.0',
      status: versionStatus,
      createdBy: ownerId,
      publishedAt: versionStatus === 'PUBLISHED' ? new Date() : null,
      ...(versionStatus === 'YANKED'
        ? { yankedAt: new Date(), yankedBy: admin, yankReason: 'seeded' }
        : {}),
    })
    .returning({ id: assetVersion.id });
  const versionId = v!.id;
  if (opts.pointLatest) {
    await db.update(asset).set({ latestVersionId: versionId }).where(eq(asset.id, assetId));
  }
  return { slug, assetId, versionId };
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', tokenAuthMiddleware(db, auth));
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

/** yank 请求（session 通道）；`reason` 为 `undefined` ⇒ 请求体不带该字段 */
async function yank(
  slug: string,
  version: string,
  cookie?: string,
  reason?: string | null,
  token?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...ORIGIN,
    'content-type': 'application/json',
  };
  if (cookie) headers.cookie = cookie;
  if (token) headers.authorization = `Bearer ${token}`;
  return buildApp().request(`/api/assets/${slug}/versions/${version}/yank`, {
    method: 'POST',
    headers,
    body: JSON.stringify(reason === undefined || reason === null ? {} : { reason }),
  });
}

async function codeOf(res: Response): Promise<string> {
  return ((await res.json()) as { code?: string }).code ?? '';
}
async function versionRow(versionId: number) {
  const [row] = await db
    .select({
      status: assetVersion.status,
      yankedAt: assetVersion.yankedAt,
      yankedBy: assetVersion.yankedBy,
      yankReason: assetVersion.yankReason,
    })
    .from(assetVersion)
    .where(eq(assetVersion.id, versionId));
  return row;
}
async function yankAuditCount(assetId: number): Promise<number> {
  const rows = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(and(eq(auditLog.action, 'asset.version_yank'), eq(auditLog.targetId, String(assetId))));
  return rows.length;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'ynk-rt-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(60_000, 10);
  owner = await makeUser('owner');
  admin = await makeUser('admin');
  superAdmin = await makeUser('super');
  await setRole(admin, ACCOUNT_ROLE.ADMIN);
  await setRole(superAdmin, ACCOUNT_ROLE.SUPER_ADMIN);
});

afterAll(async () => {
  // 清理链序：**asset_version → asset → user**。
  // 实证（首跑两个 fail 的根因）：`asset_version.asset_id` 的 FK **不带 onDelete**
  // （`db/schema/assets.ts` `.references(() => asset.id)`）⇒ 不是 CASCADE，直接删资产会被 RESTRICT 拦
  // （constraint `asset_version_asset_id_asset_id_fk`）；而 afterAll 崩掉会**遗留 user/asset**，
  // 连带后续文件自己的 cleanup 撞 `asset_owner_id_user_id_fk`（全量轮第二个 fail）。
  const owners = [owner, admin, superAdmin].filter(Boolean);
  if (owners.length > 0) {
    const mine = await db
      .select({ id: asset.id })
      .from(asset)
      .where(inArray(asset.ownerId, owners));
    if (mine.length > 0) {
      await db.delete(assetVersion).where(
        inArray(
          assetVersion.assetId,
          mine.map((m) => m.id),
        ),
      );
      await db.delete(asset).where(inArray(asset.ownerId, owners));
    }
  }
  await cleanupCreatedUsers(db);
  await db.$client.end();
  await rm(storageDir, { recursive: true, force: true });
});

describe('yank 路由 · 鉴权矩阵（design §4.6 R9——治理最严面）', () => {
  it('匿名 ⇒ 401（requireAuth 前置，不达角色判定）', async () => {
    const { slug } = await seed('anon', 'PUBLISHED', { pointLatest: true });
    expect((await yank(slug, '1.0.0', undefined, 'r')).status).toBe(401);
  });

  it('普通用户（**即使是资产 owner**）⇒ 403 auth.forbidden', async () => {
    const { slug } = await seed('owner', 'PUBLISHED', { pointLatest: true });
    const res = await yank(slug, '1.0.0', await cookieFor(owner), 'r');
    expect(res.status).toBe(403);
    expect(await codeOf(res)).toBe('auth.forbidden');
  });

  it('管理档 ⇒ 200；超管 ⇒ 200（矩阵对称）', async () => {
    const first = await seed('adm', 'PUBLISHED', { pointLatest: true });
    expect((await yank(first.slug, '1.0.0', await cookieFor(admin), 'r')).status).toBe(200);
    const second = await seed('sup', 'PUBLISHED', { pointLatest: true });
    expect((await yank(second.slug, '1.0.0', await cookieFor(superAdmin), 'r')).status).toBe(200);
  });
});

describe('yank 路由 · 入参校验（reason 必填）', () => {
  it('缺 reason 字段 ⇒ 400 asset.yank_reason_required', async () => {
    const { slug, versionId } = await seed('noreason', 'PUBLISHED', { pointLatest: true });
    const res = await yank(slug, '1.0.0', await cookieFor(admin), undefined);
    expect(res.status).toBe(400);
    expect(await codeOf(res)).toBe('asset.yank_reason_required');
    // 反证：未落任何副作用
    expect((await versionRow(versionId))!.status).toBe('PUBLISHED');
  });

  it('reason 为纯空白 ⇒ 400 且不落副作用', async () => {
    const { slug, versionId } = await seed('blankreason', 'PUBLISHED', { pointLatest: true });
    const res = await yank(slug, '1.0.0', await cookieFor(admin), '   ');
    expect(res.status).toBe(400);
    expect(await codeOf(res)).toBe('asset.yank_reason_required');
    expect((await versionRow(versionId))!.status).toBe('PUBLISHED');
  });
});

describe('yank 路由 · 状态门与 latest 透出', () => {
  it('PUBLISHED ⇒ 200 {status:YANKED, latestVersionId:null} + 三列留痕 + 审计', async () => {
    const { slug, assetId, versionId } = await seed('ok', 'PUBLISHED', { pointLatest: true });
    const res = await yank(slug, '1.0.0', await cookieFor(admin), 'security incident');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'YANKED', latestVersionId: null });

    const row = (await versionRow(versionId))!;
    expect(row.status).toBe('YANKED');
    expect(row.yankedBy).toBe(admin);
    expect(row.yankReason).toBe('security incident');
    expect(row.yankedAt).not.toBeNull();

    // latest 指针归零（路由层把 service 返回值**透出**——响应体 = 库真值）
    const [a] = await db
      .select({ latest: asset.latestVersionId })
      .from(asset)
      .where(eq(asset.id, assetId));
    expect(a!.latest).toBeNull();
    expect(await yankAuditCount(assetId)).toBe(1);
  });

  it('多 PUBLISHED：yank 当前 latest ⇒ 响应 latestVersionId 指回剩余最新', async () => {
    const { slug, assetId, versionId } = await seed('multi', 'PUBLISHED', { pointLatest: true });
    const [older] = await db
      .insert(assetVersion)
      .values({
        assetId,
        version: '0.9.0',
        status: 'PUBLISHED',
        createdBy: owner,
        publishedAt: new Date(Date.now() - 3600_000),
      })
      .returning({ id: assetVersion.id });

    const res = await yank(slug, '1.0.0', await cookieFor(admin), 'bad release');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'YANKED', latestVersionId: older!.id });
    expect((await versionRow(versionId))!.status).toBe('YANKED');
    expect((await versionRow(older!.id))!.status).toBe('PUBLISHED');
  });

  it('非 PUBLISHED（DRAFT）⇒ 400 asset.version_not_yankable', async () => {
    const { slug, versionId } = await seed('draft', 'DRAFT');
    const res = await yank(slug, '1.0.0', await cookieFor(admin), 'r');
    expect(res.status).toBe(400);
    expect(await codeOf(res)).toBe('asset.version_not_yankable');
    expect((await versionRow(versionId))!.status).toBe('DRAFT');
  });

  it('已 YANKED 再 yank ⇒ 400（**非幂等，明示契约**）且留痕不被覆写、审计不增行', async () => {
    const { slug, assetId, versionId } = await seed('again', 'YANKED', { pointLatest: true });
    const before = await yankAuditCount(assetId);
    const res = await yank(slug, '1.0.0', await cookieFor(admin), 'second attempt');
    expect(res.status).toBe(400);
    expect(await codeOf(res)).toBe('asset.version_not_yankable');
    const row = (await versionRow(versionId))!;
    expect(row.yankReason).toBe('seeded'); // 原留痕保留（未被二次调用覆写）
    expect(await yankAuditCount(assetId)).toBe(before);
  });
});

describe('yank 路由 · 坐标解析与形态守卫', () => {
  it('版本不存在 ⇒ 404 asset.not_found', async () => {
    const { slug } = await seed('noversion', 'PUBLISHED', { pointLatest: true });
    const res = await yank(slug, '9.9.9', await cookieFor(admin), 'r');
    expect(res.status).toBe(404);
    expect(await codeOf(res)).toBe('asset.not_found');
  });

  it('资产不存在 ⇒ 404 asset.not_found', async () => {
    const res = await yank(`${PREFIX}missing`, '1.0.0', await cookieFor(admin), 'r');
    expect(res.status).toBe(404);
    expect(await codeOf(res)).toBe('asset.not_found');
  });

  it('版本形态非法（非三段 semver）⇒ 404（形态守卫先于查库）', async () => {
    const { slug } = await seed('badver', 'PUBLISHED', { pointLatest: true });
    const res = await yank(slug, '1.0', await cookieFor(admin), 'r');
    expect(res.status).toBe(404);
    expect(await codeOf(res)).toBe('asset.not_found');
  });
});

describe('yank 路由 · token 通道 scope 交集（R14）', () => {
  it('携带 asset:manage 的令牌（ADMIN 用户）⇒ 200', async () => {
    const { slug } = await seed('tok-ok', 'PUBLISHED', { pointLatest: true });
    const { plain } = await mintApiKey(auth, admin, { scope: ['asset:manage'] });
    const res = await yank(slug, '1.0.0', undefined, 'via token', plain);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'YANKED', latestVersionId: null });
  });

  it('令牌不含 asset:manage（仅 review:approve）⇒ 403 auth.forbidden', async () => {
    const { slug, versionId } = await seed('tok-scope', 'PUBLISHED', { pointLatest: true });
    const { plain } = await mintApiKey(auth, admin, { scope: ['review:approve'] });
    const res = await yank(slug, '1.0.0', undefined, 'via token', plain);
    expect(res.status).toBe(403);
    expect(await codeOf(res)).toBe('auth.forbidden');
    expect((await versionRow(versionId))!.status).toBe('PUBLISHED'); // 反证：scope 拒绝先于写
  });
});
