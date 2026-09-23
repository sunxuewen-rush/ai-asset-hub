/**
 * `/api/admin` 三只读端点测试（M4b-6 T1 · 服务端改动 1–3）。
 *
 * 覆盖：**鉴权矩阵**（未登录 401 / 用户档 403 / 管理档 200）· **聚合口径**（KPI 增量 + 创意四项与
 * 「独立复算」逐项对齐）· **`days` 越界夹档**（U8）· **排行榜稳定排序**（D53）· 资产名解析（版本投影）
 * 与标签名回退链（`pickDisplayName`）。
 *
 * 断言策略：测试库含其他用例的数据 ⇒ **一律用增量（before/after）或独立复算**，不用绝对数字。
 *
 * ⚠ T3 提示：`trends` 的下载两态断言按「迁移 0014 **未落**」写（= `null`）；T3 落表后本文件需改为
 * 「表在 ⇒ 数值（空表 ⇒ 0）」，并替换该用例。
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, like, sql } from 'drizzle-orm';
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

import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { ACCOUNT_ROLE, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import type { AssetStatus } from '../db/schema/index.js';
import {
  asset,
  assetLabel,
  assetVersion,
  downloadEvent,
  labelDefinition,
  labelTranslation,
  reviewTask,
  user,
} from '../db/schema/index.js';
import { createAdminRoutes } from './admin.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';

const PREFIX = 'adm-';
let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let adminId: string;
let adminCookie: string;
let memberId: string;
let memberCookie: string;

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', officialSessionMiddleware(auth));
  app.onError((err, c) => {
    if (err instanceof AuthError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/admin', createAdminRoutes({ db }));
  return app;
}

async function get(url: string, cookie?: string): Promise<Response> {
  const headers: Record<string, string> = {
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
  };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method: 'GET', headers });
}

async function getJson<T>(url: string, cookie: string): Promise<T> {
  const res = await get(url, cookie);
  expect(res.status).toBe(200);
  return (await res.json()) as T;
}

interface OverviewBody {
  types: Array<{ type: string; count: number; downloads: number }>;
  kpi: {
    activeAssets: number;
    allAssets: number;
    downloads: number;
    pending: number;
    reviewsTotal: number;
    activeUsers: number;
    allUsers: number;
  };
  creative: {
    reviewSpeed: number | null;
    concentration: number | null;
    labelCoverage: number | null;
    sleeping: number;
  };
}
interface RankItem {
  id: string;
  name: string;
  value: number;
}
interface RankingsBody {
  people: RankItem[];
  labels: RankItem[];
  assets: RankItem[];
}
interface TrendsBody {
  days: number;
  points: Array<{ day: string; assets: number; downloads: number | null }>;
}

let slugSeq = 0;
const nextSlug = (tag: string): string => `${PREFIX}${tag}-${++slugSeq}`;

async function insertAsset(opts: {
  ownerId: string;
  status?: AssetStatus;
  downloads?: number;
  tag: string;
}): Promise<{ id: number; slug: string }> {
  const slug = nextSlug(opts.tag);
  const rows = await db
    .insert(asset)
    .values({
      slug,
      type: 'skill',
      ownerId: opts.ownerId,
      status: opts.status ?? 'ACTIVE',
      downloadCount: opts.downloads ?? 0,
    })
    .returning({ id: asset.id, slug: asset.slug });
  return rows[0]!;
}

async function insertVersion(
  assetId: number,
  opts: { status?: 'DRAFT' | 'PUBLISHED'; publishedAt?: Date | null; name?: string } = {},
): Promise<number> {
  const rows = await db
    .insert(assetVersion)
    .values({
      assetId,
      version: `1.0.${++slugSeq}`,
      status: opts.status ?? 'PUBLISHED',
      publishedAt: opts.publishedAt ?? null,
      parsedMetadataJson: opts.name === undefined ? null : { name: opts.name },
    })
    .returning({ id: assetVersion.id });
  return rows[0]!.id;
}

async function insertReview(opts: {
  assetVersionId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedBy: string;
  submittedAt: Date;
  reviewedAt?: Date | null;
}): Promise<void> {
  await db.insert(reviewTask).values({
    assetVersionId: opts.assetVersionId,
    status: opts.status,
    submittedBy: opts.submittedBy,
    submittedAt: opts.submittedAt,
    reviewedAt: opts.reviewedAt ?? null,
  });
}

/** 独立复算：标签覆盖度 / 集中度 / 平均审核时长（不复用被测 SQL） */
async function recomputeCreative(): Promise<{
  reviewSpeed: number | null;
  concentration: number | null;
  labelCoverage: number | null;
  sleeping: number;
}> {
  // 平均审核时长：拉出 APPROVED 行的时间戳在 JS 侧求平均（独立于被测的 SQL avg）
  const approved = await db
    .select({ submittedAt: reviewTask.submittedAt, reviewedAt: reviewTask.reviewedAt })
    .from(reviewTask)
    .where(and(eq(reviewTask.status, 'APPROVED'), sql`${reviewTask.reviewedAt} is not null`));
  const reviewSpeed =
    approved.length === 0
      ? null
      : approved.reduce(
          (acc, r) => acc + (r.reviewedAt!.getTime() - r.submittedAt.getTime()) / 3_600_000,
          0,
        ) / approved.length;

  // 集中度：拉全部资产下载数在 JS 侧排序取 Top10 求和
  const downloads = await db.select({ d: asset.downloadCount }).from(asset);
  const totalDownloads = downloads.reduce((acc, r) => acc + Number(r.d), 0);
  const top10 = [...downloads]
    .map((r) => Number(r.d))
    .sort((a, b) => b - a)
    .slice(0, 10)
    .reduce((acc, d) => acc + d, 0);
  const concentration = totalDownloads > 0 ? top10 / totalDownloads : null;

  // 标签覆盖度 + 沉睡资产：拉 ACTIVE 资产与「已发布版本时间」在 JS 侧判定
  const active = await db
    .select({ id: asset.id, downloads: asset.downloadCount })
    .from(asset)
    .where(eq(asset.status, 'ACTIVE'));
  const labeled = await db.selectDistinct({ assetId: assetLabel.assetId }).from(assetLabel);
  const labeledSet = new Set(labeled.map((l) => l.assetId));
  const labelCoverage =
    active.length === 0 ? null : active.filter((a) => labeledSet.has(a.id)).length / active.length;

  const cutoff = Date.now() - 30 * 86_400_000;
  const pubs = await db
    .select({
      assetId: assetVersion.assetId,
      publishedAt: assetVersion.publishedAt,
      id: assetVersion.id,
    })
    .from(assetVersion)
    .where(and(eq(assetVersion.status, 'PUBLISHED'), sql`${assetVersion.publishedAt} is not null`));
  const publishedAssets = new Set(
    pubs.filter((p) => p.publishedAt!.getTime() <= cutoff).map((p) => p.assetId),
  );
  const sleeping = active.filter(
    (a) => Number(a.downloads) === 0 && publishedAssets.has(a.id),
  ).length;

  return { reviewSpeed, concentration, labelCoverage, sleeping };
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });

  adminId = await createTestUser(db, {
    id: `${PREFIX}admin_${randomUUID()}`,
    displayName: `${PREFIX}admin`,
  });
  await setUserRole(db, adminId, ACCOUNT_ROLE.ADMIN);
  adminCookie = await signInCookie(auth, adminId);

  memberId = await createTestUser(db, {
    id: `${PREFIX}member_${randomUUID()}`,
    displayName: `${PREFIX}member`,
  });
  memberCookie = await signInCookie(auth, memberId);
});

afterAll(async () => {
  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.id, `${PREFIX}%`));
  const assets = await db
    .select({ id: asset.id })
    .from(asset)
    .where(like(asset.slug, `${PREFIX}%`));
  const assetIds = assets.map((a) => a.id);
  if (assetIds.length > 0) {
    const versions = await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(inArray(assetVersion.assetId, assetIds));
    const versionIds = versions.map((v) => v.id);
    if (versionIds.length > 0) {
      await db.delete(reviewTask).where(inArray(reviewTask.assetVersionId, versionIds));
      await db.delete(assetVersion).where(inArray(assetVersion.id, versionIds));
    }
    await db.delete(assetLabel).where(inArray(assetLabel.assetId, assetIds));
    await db.delete(asset).where(inArray(asset.id, assetIds));
  }
  const labels = await db
    .select({ id: labelDefinition.id })
    .from(labelDefinition)
    .where(like(labelDefinition.slug, `${PREFIX}%`));
  const labelIds = labels.map((l) => l.id);
  if (labelIds.length > 0) {
    await db.delete(labelTranslation).where(inArray(labelTranslation.labelId, labelIds));
    await db.delete(labelDefinition).where(inArray(labelDefinition.id, labelIds));
  }
  for (const u of users) void u;
  await cleanupCreatedUsers(db);
});

describe('T1 · 鉴权矩阵（三端点）', () => {
  const urlOf = ['/api/admin/overview', '/api/admin/rankings', '/api/admin/trends'];

  it('未登录 ⇒ 401（三端点一致）', async () => {
    for (const url of urlOf) {
      const res = await get(url);
      expect(res.status).toBe(401);
    }
  });

  it('用户档（role 0）⇒ 403（三端点一致）', async () => {
    for (const url of urlOf) {
      const res = await get(url, memberCookie);
      expect(res.status).toBe(403);
    }
  });

  it('管理档 ⇒ 200（三端点一致）', async () => {
    for (const url of urlOf) {
      const res = await get(url, adminCookie);
      expect(res.status).toBe(200);
    }
  });
});

describe('T1 · overview 聚合口径', () => {
  it('KPI 增量：资产状态 / 下载 / 审核 / 账号逐项对上', async () => {
    const before = await getJson<OverviewBody>('/api/admin/overview', adminCookie);

    const a1 = await insertAsset({ ownerId: memberId, downloads: 3, tag: 'kpi-a' });
    const a2 = await insertAsset({ ownerId: memberId, downloads: 0, tag: 'kpi-b' });
    await insertAsset({ ownerId: memberId, status: 'HIDDEN', tag: 'kpi-hidden' });
    await insertAsset({ ownerId: memberId, status: 'ARCHIVED', tag: 'kpi-archived' });
    void a1;
    void a2;

    const v1 = await insertVersion(a1.id);
    await insertReview({
      assetVersionId: v1,
      status: 'PENDING',
      submittedBy: memberId,
      submittedAt: new Date(Date.now() - 3_600_000),
    });
    const v2 = await insertVersion(a2.id);
    await insertReview({
      assetVersionId: v2,
      status: 'APPROVED',
      submittedBy: memberId,
      submittedAt: new Date(Date.now() - 7_200_000),
      reviewedAt: new Date(),
    });

    // 账号：+1 ACTIVE +1 DISABLED（allUsers +2 / activeUsers +1）
    const extraActive = await createTestUser(db, {
      id: `${PREFIX}user-active_${randomUUID()}`,
      displayName: `${PREFIX}user-active`,
    });
    void extraActive;
    const disabledId = await createTestUser(db, {
      id: `${PREFIX}user-disabled_${randomUUID()}`,
      displayName: `${PREFIX}user-disabled`,
    });
    await db.update(user).set({ status: 'DISABLED' }).where(eq(user.id, disabledId));

    const after = await getJson<OverviewBody>('/api/admin/overview', adminCookie);

    expect(after.kpi.activeAssets - before.kpi.activeAssets).toBe(2);
    expect(after.kpi.allAssets - before.kpi.allAssets).toBe(4);
    expect(after.kpi.downloads - before.kpi.downloads).toBe(3);
    expect(after.kpi.pending - before.kpi.pending).toBe(1);
    expect(after.kpi.reviewsTotal - before.kpi.reviewsTotal).toBe(2);
    expect(after.kpi.activeUsers - before.kpi.activeUsers).toBe(1);
    expect(after.kpi.allUsers - before.kpi.allUsers).toBe(2);

    // F203：类型级聚合（(e)/(f) 两图数据源）—— 两个 ACTIVE skill 资产 ⇒ skill 计数 +2 · 下载 +3
    const skillBefore = before.types.find((t) => t.type === 'skill')?.count ?? 0;
    const skillAfter = after.types.find((t) => t.type === 'skill')?.count ?? 0;
    expect(skillAfter - skillBefore).toBe(2);
    const dlBefore = before.types.find((t) => t.type === 'skill')?.downloads ?? 0;
    const dlAfter = after.types.find((t) => t.type === 'skill')?.downloads ?? 0;
    expect(dlAfter - dlBefore).toBe(3);
  });

  it('创意四项与「独立复算」逐项对齐（含沉睡阈值两侧）', async () => {
    // 沉睡边界：31 天前发布 ⇒ 计；29 天前 ⇒ 不计；40 天前但已下载 ⇒ 不计；非 ACTIVE ⇒ 不计
    const owner = memberId;
    const dayMs = 86_400_000;
    // ⚠ 顺序：`before` 必须在造 fixture **之前**取（否则沉睡增量恒 0）
    const before = await getJson<OverviewBody>('/api/admin/overview', adminCookie);

    const sleep31 = await insertAsset({ ownerId: owner, downloads: 0, tag: 'sleep-31' });
    await insertVersion(sleep31.id, { publishedAt: new Date(Date.now() - 31 * dayMs) });

    const sleep29 = await insertAsset({ ownerId: owner, downloads: 0, tag: 'sleep-29' });
    await insertVersion(sleep29.id, { publishedAt: new Date(Date.now() - 29 * dayMs) });

    const sleepDownloaded = await insertAsset({ ownerId: owner, downloads: 5, tag: 'sleep-dl' });
    await insertVersion(sleepDownloaded.id, { publishedAt: new Date(Date.now() - 40 * dayMs) });

    const sleepHidden = await insertAsset({
      ownerId: owner,
      status: 'HIDDEN',
      downloads: 0,
      tag: 'sleep-hidden',
    });
    await insertVersion(sleepHidden.id, { publishedAt: new Date(Date.now() - 40 * dayMs) });

    const body = await getJson<OverviewBody>('/api/admin/overview', adminCookie);
    const beforeRecompute = await recomputeCreative();

    // ① 端点与独立复算一致（相对 ±0.0001 的浮点）
    expect(body.creative.sleeping).toBe(beforeRecompute.sleeping);
    expect(
      Math.abs((body.creative.reviewSpeed ?? 0) - (beforeRecompute.reviewSpeed ?? 0)),
    ).toBeLessThan(0.001);
    expect(
      Math.abs((body.creative.concentration ?? 0) - (beforeRecompute.concentration ?? 0)),
    ).toBeLessThan(1e-9);
    expect(
      Math.abs((body.creative.labelCoverage ?? 0) - (beforeRecompute.labelCoverage ?? 0)),
    ).toBeLessThan(1e-9);

    // ② 沉睡增量：仅「31 天前 + 零下载 + ACTIVE」这一条计入
    expect(body.creative.sleeping - before.creative.sleeping).toBe(1);
    expect(body.creative.concentration).not.toBeNull();
    expect(body.creative.labelCoverage).not.toBeNull();
    expect(typeof body.creative.reviewSpeed).toBe('number');
  });
});

describe('T1 · rankings 三口径', () => {
  it('人榜：值 = 该 owner 的 ACTIVE 资产数（非 ACTIVE 不计）', async () => {
    const owner = await createTestUser(db, {
      id: `${PREFIX}rankowner_${randomUUID()}`,
      displayName: `${PREFIX}rankowner`,
    });
    await insertAsset({ ownerId: owner, tag: 'rank-1' });
    await insertAsset({ ownerId: owner, tag: 'rank-2' });
    await insertAsset({ ownerId: owner, status: 'HIDDEN', tag: 'rank-3' });

    const body = await getJson<RankingsBody>('/api/admin/rankings?limit=100', adminCookie);
    const mine = body.people.find((p) => p.id === owner);
    expect(mine?.value).toBe(2);
    expect(mine?.name).toBe(`${PREFIX}rankowner`);
  });

  it('标签榜：挂载数 + 显示名走回退链（zh-CN → zh → en → slug）', async () => {
    const labelSlug = nextSlug('rank-label');
    const rows = await db
      .insert(labelDefinition)
      .values({ slug: labelSlug, type: 'RECOMMENDED' })
      .returning({ id: labelDefinition.id });
    const labelId = rows[0]!.id;
    await db.insert(labelTranslation).values([
      { labelId, locale: 'zh', displayName: `${PREFIX}标签中文` },
      { labelId, locale: 'en', displayName: `${PREFIX}label-en` },
    ]);
    const owned = await insertAsset({ ownerId: memberId, tag: 'rank-label-asset' });
    await db.insert(assetLabel).values({ assetId: owned.id, labelId });

    const body = await getJson<RankingsBody>('/api/admin/rankings?limit=100', adminCookie);
    const mine = body.labels.find((l) => l.id === labelSlug);
    expect(mine?.value).toBe(1);
    // 存量 locale 为 `zh`（非 `zh-CN`）⇒ 命中主语言前缀回退（06 §2.3 回退链）
    expect(mine?.name).toBe(`${PREFIX}标签中文`);
  });

  it('资产榜：值 = download_count · 名称 = latest 版本投影（缺投影 ⇒ slug）', async () => {
    const withName = await insertAsset({
      ownerId: memberId,
      downloads: 9,
      tag: 'rank-asset-named',
    });
    const verId = await insertVersion(withName.id, {
      publishedAt: new Date(),
      name: `${PREFIX}投影名`,
    });
    await db.update(asset).set({ latestVersionId: verId }).where(eq(asset.id, withName.id));

    const noName = await insertAsset({ ownerId: memberId, downloads: 8, tag: 'rank-asset-raw' });
    await insertVersion(noName.id, { publishedAt: new Date() });

    const body = await getJson<RankingsBody>('/api/admin/rankings?limit=100', adminCookie);
    const named = body.assets.find((a) => a.id === withName.slug);
    expect(named?.value).toBe(9);
    expect(named?.name).toBe(`${PREFIX}投影名`);
    const raw = body.assets.find((a) => a.id === noName.slug);
    expect(raw?.name).toBe(noName.slug);
  });

  it('稳定排序（D53）：两次请求序列一致 · 值单调不增 · 并列按主键升序', async () => {
    const first = await getJson<RankingsBody>('/api/admin/rankings?limit=50', adminCookie);
    const second = await getJson<RankingsBody>('/api/admin/rankings?limit=50', adminCookie);

    for (const key of ['people', 'labels', 'assets'] as const) {
      expect(first[key].map((r) => r.id)).toEqual(second[key].map((r) => r.id));
      const values = first[key].map((r) => r.value);
      expect(values).toEqual([...values].sort((a, b) => b - a));
      // 并列 ⇒ 主键升序（人 = user.id · 标签/资产 = slug 或 id 由 SQL 决定，此处仅校验「并列组内 id 升序」对 people 成立）
      if (key === 'people') {
        for (let i = 1; i < first[key].length; i += 1) {
          const prev = first[key][i - 1]!;
          const cur = first[key][i]!;
          if (prev.value === cur.value) expect(prev.id < cur.id).toBe(true);
        }
      }
    }
  });

  it('limit 钳制：0 / 101 ⇒ 400 · 1 ⇒ 各口径 ≤1 条', async () => {
    expect((await get('/api/admin/rankings?limit=0', adminCookie)).status).toBe(400);
    expect((await get('/api/admin/rankings?limit=101', adminCookie)).status).toBe(400);
    const body = await getJson<RankingsBody>('/api/admin/rankings?limit=1', adminCookie);
    expect(body.people.length).toBeLessThanOrEqual(1);
    expect(body.labels.length).toBeLessThanOrEqual(1);
    expect(body.assets.length).toBeLessThanOrEqual(1);
  });
});

describe('T1 · trends 窗口与夹档', () => {
  it('默认 30 点 · 末点 = 上海今天 · 资产累计单调不减', async () => {
    const body = await getJson<TrendsBody>('/api/admin/trends', adminCookie);
    expect(body.days).toBe(30);
    expect(body.points.length).toBe(30);

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    expect(body.points.at(-1)!.day).toBe(today);

    const assets = body.points.map((p) => p.assets);
    expect(assets).toEqual([...assets].sort((a, b) => a - b));
  });

  it('越界值夹到最近档（U8）：13⇒7 · 9999⇒365 · -5⇒7 · 0⇒7', async () => {
    for (const [input, expected] of [
      ['13', 7],
      ['9999', 365],
      ['-5', 7],
      ['0', 7],
      ['180', 180],
    ] as const) {
      const body = await getJson<TrendsBody>(`/api/admin/trends?days=${input}`, adminCookie);
      expect(body.days).toBe(expected);
      expect(body.points.length).toBe(expected);
    }
  });

  it('非数字参数 ⇒ 400（夹档只针对数值越界）', async () => {
    const res = await get('/api/admin/trends?days=abc', adminCookie);
    expect(res.status).toBe(400);
  });

  it('下载两态（D52）：表在 ⇒ 数值（空表 ⇒ 0）· 事件进曲线（表缺 ⇒ 全 null）', async () => {
    const body = await getJson<TrendsBody>('/api/admin/trends?days=7', adminCookie);
    // ⚠ T3 落 0014 后：本条应改为「表在 ⇒ 数值（空表 ⇒ 0）」
    const present = (await db.execute(
      sql`select to_regclass('public.download_event') is not null as present`,
    )) as unknown as { rows?: Array<{ present: boolean }> };
    const hasTable = present.rows?.[0]?.present === true;
    if (!hasTable) {
      expect(body.points.every((p) => p.downloads === null)).toBe(true);
    } else {
      expect(body.points.every((p) => typeof p.downloads === 'number')).toBe(true);
      // 表在 ⇒ 事件真的进曲线：插 2 行事件（今天）后，末点累计值增量 ≥ 2（容忍并发插入）
      const before = body.points.at(-1)!.downloads ?? 0;
      const owned = await insertAsset({ ownerId: memberId, tag: 'trend-ev' });
      await db.insert(downloadEvent).values([
        { assetId: owned.id, versionId: null },
        { assetId: owned.id, versionId: null },
      ]);
      const after = await getJson<TrendsBody>('/api/admin/trends?days=7', adminCookie);
      expect((after.points.at(-1)!.downloads ?? 0) - before).toBeGreaterThanOrEqual(2);
    }
  });
});
