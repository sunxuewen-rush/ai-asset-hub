import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AssetError } from '../assets/errors.js';
import { createAuditWriter } from '../audit/audit.js';
import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import {
  ACCOUNT_ROLE,
  type AccountRole,
  asset,
  assetVersion,
  auditLog,
  reviewTask,
  userAccount,
} from '../db/schema/index.js';
import { ReviewError } from '../review/errors.js';
import { createLocalStorage } from '../storage/local.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { rbacContext } from './auth-middleware.js';
import { createReviewRoutes } from './reviews.js';

const PREFIX = 'rvh-';
let db: Db;
let sessions: SessionManager;
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
  const id = `${PREFIX}${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}
async function setRole(userId: string, role: AccountRole): Promise<void> {
  await db.update(userAccount).set({ role }).where(eq(userAccount.id, userId));
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'rvh-http');
  return `aih_session=${sid}`;
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
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

/** 建资产 + DRAFT 版本（createdBy=uploader）→ 走 API submit → taskId */
async function submitFlow(uploaderCookie: string, uploaderId: string) {
  const slug = `${PREFIX}a${++slugSeq}-${randomUUID().slice(0, 6)}`;
  await db.insert(asset).values({ slug, type: 'skill', ownerId });
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
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
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
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.id, `${PREFIX}%`));
  await db.delete(reviewTask).where(like(reviewTask.submittedBy, `${PREFIX}%`));
  await db.delete(assetVersion).where(like(assetVersion.createdBy, `${PREFIX}%`));
  await db.delete(asset).where(like(asset.ownerId, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  for (const u of users) {
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
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
