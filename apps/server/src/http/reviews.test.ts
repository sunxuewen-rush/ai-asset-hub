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

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AssetError } from '../assets/errors.js';
import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { ACCOUNT_ROLE, type AccountRole, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import {
  type AssetType,
  asset,
  assetVersion,
  auditLog,
  reviewTask,
  user,
} from '../db/schema/index.js';
import { ReviewError } from '../review/errors.js';
import { createLocalStorage } from '../storage/local.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { createReviewRoutes } from './reviews.js';

const PREFIX = 'rvh-';
let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let ownerId: string; // 资产 owner
let contributorId: string; // 上传者/提交人
let exSpaceAdminId: string; // 原空间 ADMIN（无平台角色——空间面已删）
let assetAdminUserId: string; // 平台 ASSET_ADMIN
let strangerId: string;
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
let audit!: ReturnType<typeof createAuditWriter>;
let uploadRateLimiter!: InMemoryRateLimiter;

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
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403 | 404);
    if (err instanceof AssetError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    if (err instanceof ReviewError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  app.route('/api/reviews', createReviewRoutes({ db, audit }));
  return app;
}

const ORIGIN = { origin: 'http://localhost:3000' };
function jsonReq(method: string, url: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...ORIGIN,
    host: 'localhost:3000',
  };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method, headers, body: JSON.stringify(body) });
}
function getReq(url: string, cookie?: string) {
  const headers: Record<string, string> = { host: 'localhost:3000' };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(url, { method: 'GET', headers });
}
function postJson(url: string, body: unknown, cookie?: string) {
  return jsonReq('POST', url, body, cookie);
}

let slugSeq = 0;

/**
 * 建资产 + DRAFT 版本（createdBy=uploader）→ 走 API submit → taskId
 * M4b-3 T1：第 3 参 `type` 可选（默认 'skill'）⇒ 既有调用零改动，读面加性断言可构造 mcp 资产。
 */
async function submitFlow(uploaderCookie: string, uploaderId: string, type: AssetType = 'skill') {
  const slug = `${PREFIX}a${++slugSeq}-${randomUUID().slice(0, 6)}`;
  await db.insert(asset).values({ slug, type, ownerId });
  await db.insert(assetVersion).values({
    assetId: (await db.select({ id: asset.id }).from(asset).where(eq(asset.slug, slug)))[0]!.id,
    version: '1.0.0',
    status: 'DRAFT',
    createdBy: uploaderId,
  });
  const res = await postJson(`/api/assets/${slug}/versions/1.0.0/submit`, {}, uploaderCookie);
  expect(res.status).toBe(201);
  const body = (await res.json()) as { taskId: number; reviewVersion: number; status: string };
  expect(body.status).toBe('PENDING_REVIEW');
  return { slug, taskId: body.taskId };
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'rvh-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max);
  ownerId = await makeUser('owner');
  contributorId = await makeUser('contributor');
  exSpaceAdminId = await makeUser('spaceadmin');
  assetAdminUserId = await makeUser('assetadmin');
  strangerId = await makeUser('stranger');
  await setRole(assetAdminUserId, ACCOUNT_ROLE.ADMIN);
});

afterAll(async () => {
  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.id, `${PREFIX}%`));
  await db.delete(reviewTask).where(like(reviewTask.submittedBy, `${PREFIX}%`));
  await db.delete(assetVersion).where(like(assetVersion.createdBy, `${PREFIX}%`));
  await db.delete(asset).where(like(asset.ownerId, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  for (const _u of users) {
    await cleanupCreatedUsers(db);
  }
  await db.$client.end();
});

describe('submit 端点（M3 design §3.1 R2——API 面）', () => {
  it('上传者本人提交自己的 DRAFT → 201 PENDING_REVIEW + 队列可见', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(like(assetVersion.version, '1.0.0'))
      .orderBy(assetVersion.id)
      .limit(1);
    void ver;
    // 详情端点本人可见
    const mine = await getReq(`/api/reviews/${taskId}`, contributorCookie);
    expect(mine.status).toBe(200);
  });

  it('stranger（非成员非上传者非 owner）submit → 403 review.access_denied', async () => {
    const slug = `${PREFIX}x${++slugSeq}`;
    await db.insert(asset).values({ slug, type: 'skill', ownerId });
    const [a] = await db.select({ id: asset.id }).from(asset).where(eq(asset.slug, slug));
    await db
      .insert(assetVersion)
      .values({ assetId: a!.id, version: '1.0.0', status: 'DRAFT', createdBy: ownerId });
    const res = await postJson(
      `/api/assets/${slug}/versions/1.0.0/submit`,
      {},
      await cookieFor(strangerId),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('review.access_denied');
  });

  it('匿名 submit → 401', async () => {
    const res = await postJson('/api/assets/x/versions/1.0.0/submit', {});
    expect(res.status).toBe(401);
  });
});

describe('审核队列/详情/动作（M3 design §3.7/§9 R8——API 面）', () => {
  it('平台管理档全量队列可见（全站单队列）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await getReq('/api/reviews', await cookieFor(assetAdminUserId));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ taskId: number }>; total: number };
    expect(body.items.some((i) => i.taskId === taskId)).toBe(true);
  });

  it('原空间 ADMIN（无平台角色）：带/不带 namespaceSlug 均 403（队列仅管理档）', async () => {
    const exSpaceAdminCookie = await cookieFor(exSpaceAdminId);
    const withParam = await getReq(`/api/reviews?namespaceSlug=${PREFIX}ns`, exSpaceAdminCookie);
    expect(withParam.status).toBe(403);
    const global = await getReq('/api/reviews', exSpaceAdminCookie);
    expect(global.status).toBe(403);
  });

  it('普通用户无审核面：GET /api/reviews → 403 review.access_denied（队列是审核面端点，mine 才是本人面）', async () => {
    const res = await getReq('/api/reviews', await cookieFor(contributorId));
    expect(res.status).toBe(403);
  });

  it('mine：提交人见自己的提交列表', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await getReq('/api/reviews/mine', contributorCookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ taskId: number }> };
    expect(body.items.some((i) => i.taskId === taskId)).toBe(true);
  });

  it('approve：管理档批准 → 200 + 版本 PUBLISHED（latest 指针落位）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { slug, taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await postJson(
      `/api/reviews/${taskId}/approve`,
      { comment: 'ok' },
      await cookieFor(assetAdminUserId),
    );
    expect(res.status).toBe(200);
    const [a] = await db.select({ id: asset.id }).from(asset).where(eq(asset.slug, slug));
    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, a!.id), eq(assetVersion.version, '1.0.0')));
    expect(ver!.status).toBe('PUBLISHED');
  });

  it('reject：comment 空 body → 400 request.invalid（路由层必填前置）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await postJson(
      `/api/reviews/${taskId}/reject`,
      { comment: '' },
      await cookieFor(assetAdminUserId),
    );
    expect(res.status).toBe(400);
  });

  it('reject：comment 合法 → REJECTED', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await postJson(
      `/api/reviews/${taskId}/reject`,
      { comment: 'license missing' },
      await cookieFor(assetAdminUserId),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { status: string }).status).toBe('REJECTED');
  });

  it('withdraw：提交人撤回 → 204 + 版本回 UPLOADED', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { slug, taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await postJson(`/api/reviews/${taskId}/withdraw`, {}, contributorCookie);
    expect(res.status).toBe(204);
    const [a] = await db.select({ id: asset.id }).from(asset).where(eq(asset.slug, slug));
    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, a!.id), eq(assetVersion.version, '1.0.0')));
    expect(ver!.status).toBe('UPLOADED');
  });

  it('越权详情：stranger → 403 review.access_denied', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await getReq(`/api/reviews/${taskId}`, await cookieFor(strangerId));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('review.access_denied');
  });

  it('approve 防自审（HTTP 面）：提交人无 review:approve → 403（自审码在服务层已测）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await postJson(`/api/reviews/${taskId}/approve`, {}, contributorCookie);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('review.access_denied');
  });
});

describe('读面加性：reviewComment + assetType（M4b-3 T1 · design §3.2#5 / §8 R6-c）', () => {
  interface ReadRow {
    taskId: number;
    reviewComment: string | null;
    assetType: string;
  }

  /** 只取本文件自己造的提交（按 taskId 精确比对——不依赖「库里只有本文件数据」） */
  async function mineRows(cookie: string): Promise<ReadRow[]> {
    const res = await getReq('/api/reviews/mine?limit=100', cookie);
    expect(res.status).toBe(200);
    return ((await res.json()) as { items: ReadRow[] }).items;
  }

  it('mine：含 reviewComment（未裁决 ⇒ null）与 assetType（值域 skill|mcp|agent）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const row = (await mineRows(contributorCookie)).find((i) => i.taskId === taskId);
    expect(row).toBeDefined();
    expect('reviewComment' in row!).toBe(true);
    expect('assetType' in row!).toBe(true);
    expect(row!.reviewComment).toBeNull();
    expect(['skill', 'mcp', 'agent']).toContain(row!.assetType);
  });

  it('mine：驳回后该行 reviewComment === 原因原文；未裁决行仍为 null', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const rejected = await submitFlow(contributorCookie, contributorId);
    const pending = await submitFlow(contributorCookie, contributorId);
    const res = await postJson(
      `/api/reviews/${rejected.taskId}/reject`,
      { comment: 'license missing' },
      await cookieFor(assetAdminUserId),
    );
    expect(res.status).toBe(200);
    const rows = await mineRows(contributorCookie);
    expect(rows.find((i) => i.taskId === rejected.taskId)!.reviewComment).toBe('license missing');
    expect(rows.find((i) => i.taskId === pending.taskId)!.reviewComment).toBeNull();
  });

  it('队列面（共用 LIST_SELECT）：同样含这两字段', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const res = await getReq('/api/reviews?limit=100', await cookieFor(assetAdminUserId));
    expect(res.status).toBe(200);
    const row = ((await res.json()) as { items: ReadRow[] }).items.find((i) => i.taskId === taskId);
    expect(row).toBeDefined();
    expect('reviewComment' in row!).toBe(true);
    expect(row!.reviewComment).toBeNull();
    expect(['skill', 'mcp', 'agent']).toContain(row!.assetType);
  });

  it('assetType 与该版本所属资产类型一致（skill / mcp 各一）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const skillTask = await submitFlow(contributorCookie, contributorId, 'skill');
    const mcpTask = await submitFlow(contributorCookie, contributorId, 'mcp');
    const rows = await mineRows(contributorCookie);
    expect(rows.find((i) => i.taskId === skillTask.taskId)!.assetType).toBe('skill');
    expect(rows.find((i) => i.taskId === mcpTask.taskId)!.assetType).toBe('mcp');
  });

  it('详情面（ReviewDetailItem 继承）：同样含这两字段', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const rejectRes = await postJson(
      `/api/reviews/${taskId}/reject`,
      { comment: 'license missing' },
      await cookieFor(assetAdminUserId),
    );
    expect(rejectRes.status).toBe(200);
    const res = await getReq(`/api/reviews/${taskId}`, contributorCookie);
    expect(res.status).toBe(200);
    const detail = (await res.json()) as ReadRow & { manifestJson: unknown; files: unknown[] };
    expect('reviewComment' in detail).toBe(true);
    expect(detail.reviewComment).toBe('license missing');
    expect(detail.assetType).toBe('skill');
  });
});

describe('读面加性：submittedByName + latestVersion（M4b-5 T2 · design §5.1 / §5.1b）', () => {
  interface Row {
    taskId: number;
    submittedBy: string;
    submittedByName: string | null;
  }

  async function listOf(path: string, cookie: string): Promise<{ items: Row[]; total: number }> {
    const res = await getReq(`${path}?limit=100`, cookie);
    expect(res.status).toBe(200);
    return (await res.json()) as { items: Row[]; total: number };
  }

  /** 给既有资产再加一版并提交（`submitFlow` 每次新建资产 ⇒ 已发布版本场景需复用同一资产） */
  async function submitNextVersion(
    slug: string,
    uploaderCookie: string,
    uploaderId: string,
    version: string,
  ) {
    const [row] = await db.select({ id: asset.id }).from(asset).where(eq(asset.slug, slug));
    await db.insert(assetVersion).values({
      assetId: row!.id,
      version,
      status: 'DRAFT',
      createdBy: uploaderId,
    });
    const res = await postJson(
      `/api/assets/${slug}/versions/${version}/submit`,
      {},
      uploaderCookie,
    );
    expect(res.status).toBe(201);
    return (await res.json()) as { taskId: number };
  }

  it('三面齐：submittedByName = 提交人本地 user.name（LDAP 建号写入 + 登录同步 ⇒ 读面不查 LDAP）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const expected = `${PREFIX}contributor`;

    const mine = (await listOf('/api/reviews/mine', contributorCookie)).items.find(
      (i) => i.taskId === taskId,
    );
    expect(mine?.submittedByName).toBe(expected);

    const queue = (await listOf('/api/reviews', await cookieFor(assetAdminUserId))).items.find(
      (i) => i.taskId === taskId,
    );
    expect(queue?.submittedByName).toBe(expected);

    const detailRes = await getReq(`/api/reviews/${taskId}`, contributorCookie);
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as Row;
    expect(detail.submittedByName).toBe(expected);
    expect(detail.submittedBy).toBe(contributorId); // 工号列真源（id = 工号）不变
  });

  it('join 不放大行数：三面 task 行数 = 本文件提交数（`user.id` 为 PK ⇒ 1:1）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const before = await listOf('/api/reviews/mine', contributorCookie);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const after = await listOf('/api/reviews/mine', contributorCookie);
    expect(after.total).toBe(before.total + 1);
    expect(after.items.filter((i) => i.taskId === taskId)).toHaveLength(1);
  });

  it('详情 latestVersion 两态：从未发布 ⇒ null；已发布 1.0.0 后再提 1.1.0 ⇒ "1.0.0"（审核面 diff 的 base）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { slug, taskId } = await submitFlow(contributorCookie, contributorId);

    // 首版审核：该资产从未发布过 ⇒ base 不存在（design §4.10「无对比对象」态）
    const first = (await (await getReq(`/api/reviews/${taskId}`, contributorCookie)).json()) as {
      latestVersion: string | null;
    };
    expect(first.latestVersion).toBeNull();

    // 批准 1.0.0（latest 指针落位）⇒ 新提 1.1.0 后，详情的 base = "1.0.0"
    const approveRes = await postJson(
      `/api/reviews/${taskId}/approve`,
      {},
      await cookieFor(assetAdminUserId),
    );
    expect(approveRes.status).toBe(200);
    const next = await submitNextVersion(slug, contributorCookie, contributorId, '1.1.0');
    const secondRes = await getReq(`/api/reviews/${next.taskId}`, contributorCookie);
    expect(secondRes.status).toBe(200);
    const second = (await secondRes.json()) as { latestVersion: string | null };
    expect(second.latestVersion).toBe('1.0.0');
  });

  it('队列 / 我的提交**不含** latestVersion（仅详情加性 ⇒ 不给列表查询背 join 性能税 · G-Q8）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const mine = (await listOf('/api/reviews/mine', contributorCookie)).items.find(
      (i) => i.taskId === taskId,
    );
    const queue = (await listOf('/api/reviews', await cookieFor(assetAdminUserId))).items.find(
      (i) => i.taskId === taskId,
    );
    expect(mine !== undefined && 'latestVersion' in mine).toBe(false);
    expect(queue !== undefined && 'latestVersion' in queue).toBe(false);
  });

  it('submittedByName 的 null 分支不可达（`reviewTask.submittedBy` 有 FK + 用户软删 DISABLED ⇒ 行恒在）', async () => {
    const contributorCookie = await cookieFor(contributorId);
    const { taskId } = await submitFlow(contributorCookie, contributorId);
    const row = (await listOf('/api/reviews/mine', contributorCookie)).items.find(
      (i) => i.taskId === taskId,
    );
    // 正常行恒有值；`| null` 只是 `leftJoin` 的防御性类型（FK 禁止悬挂引用 ⇒ 无法在本夹具构造 null）
    expect(typeof row?.submittedByName).toBe('string');
  });
});
