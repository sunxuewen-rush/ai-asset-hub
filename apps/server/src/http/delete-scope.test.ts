import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { AssetError } from '../assets/errors.js';
import { createAuditWriter } from '../audit/audit.js';
import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import {
  asset,
  assetVersion,
  auditLog,
  namespace,
  namespaceMember,
  reviewTask,
  role,
  userAccount,
  userRoleBinding,
  type RoleCode,
  type VersionStatus,
} from '../db/schema/index.js';
import { ReviewError } from '../review/errors.js';
import { createLocalStorage } from '../storage/local.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { UPLOAD_RATE_LIMIT } from './assets.js';
import { rbacContext } from './auth-middleware.js';
import { createAssetRoutes } from './assets.js';

const PREFIX = 'dsc-';
let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let ownerId: string;
let contributorId: string; // 上传者（MEMBER——非 owner）
let adminId: string; // 空间 ADMIN（非 owner 非上传者）
let strangerId: string;
let nsId: number;
let audit!: ReturnType<typeof createAuditWriter>;
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
let uploadRateLimiter!: InMemoryRateLimiter;

async function makeUser(tag: string): Promise<string> {
  const id = `${PREFIX}${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}
async function ensureRole(code: RoleCode) {
  await db.insert(role).values({ code, name: `r-${code}`, isSystem: true }).onConflictDoNothing();
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'dsc-http');
  return `aih_session=${sid}`;
}
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
  app.onError((err, c) => {
    if (err instanceof AuthError) return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    if (err instanceof AssetError) return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    if (err instanceof ReviewError) return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  return app;
}
const ORIGIN = { origin: 'http://localhost:3000' };
async function delReq(url: string, cookie: string) {
  return buildApp().request(url, { method: 'DELETE', headers: { host: 'localhost:3000', ...ORIGIN, cookie } });
}

let seq = 0;

/** 建资产（owner=ownerId）+ 指定状态版本（createdBy=uploaderId）——可选带 review_task */
async function mkVersioned(
  uploaderId: string,
  versionStatus: VersionStatus,
  taskStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN',
): Promise<{ assetId: number; slug: string }> {
  const slug = `${PREFIX}a${++seq}-${randomUUID().slice(0, 6)}`;
  const [a] = await db
    .insert(asset)
    .values({ namespaceId: nsId, slug, type: 'skill', ownerId })
    .returning({ id: asset.id });
  const [v] = await db
    .insert(assetVersion)
    .values({ assetId: a!.id, version: '1.0.0', status: versionStatus, createdBy: uploaderId })
    .returning({ id: assetVersion.id });
  if (taskStatus) {
    await db.insert(reviewTask).values({
      assetVersionId: v!.id,
      namespaceId: nsId,
      status: taskStatus,
      version: 1,
      submittedBy: uploaderId,
      reviewedBy: taskStatus === 'PENDING' ? null : adminId,
      reviewedAt: taskStatus === 'PENDING' ? null : new Date(),
    });
  }
  return { assetId: a!.id, slug };
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'dsc-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max);
  ownerId = await makeUser('owner');
  contributorId = await makeUser('contributor');
  adminId = await makeUser('admin');
  strangerId = await makeUser('stranger');
  const [ns] = await db
    .insert(namespace)
    .values({ slug: `${PREFIX}ns`, displayName: `${PREFIX}ns`, type: 'TEAM', createdBy: ownerId })
    .returning({ id: namespace.id });
  nsId = ns!.id;
  await db.insert(namespaceMember).values([
    { namespaceId: nsId, userId: ownerId, role: 'OWNER' },
    { namespaceId: nsId, userId: contributorId, role: 'MEMBER' },
    { namespaceId: nsId, userId: adminId, role: 'ADMIN' },
  ]);
});

afterAll(async () => {
  const users = await db.select({ id: userAccount.id }).from(userAccount).where(like(userAccount.id, `${PREFIX}%`));
  await db.delete(reviewTask).where(like(reviewTask.submittedBy, `${PREFIX}%`));
  await db.delete(assetVersion).where(like(assetVersion.createdBy, `${PREFIX}%`));
  await db.delete(asset).where(like(asset.ownerId, `${PREFIX}%`));
  await db.delete(namespaceMember).where(like(namespaceMember.userId, `${PREFIX}%`));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  for (const u of users) {
    await db.delete(userRoleBinding).where(eq(userRoleBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await rm(storageDir, { recursive: true, force: true });
  await db.$client.end();
});

describe('版本删除分治矩阵（design §3.4 R5）', () => {
  it('上传者本人（非 owner）删自己的 DRAFT → 204', async () => {
    const { slug } = await mkVersioned(contributorId, 'DRAFT');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}/versions/1.0.0`, await cookieFor(contributorId));
    expect(res.status).toBe(204);
  });

  it('上传者本人删自己的 SCAN_FAILED → 204（草稿族例外扩展）', async () => {
    const { slug } = await mkVersioned(contributorId, 'SCAN_FAILED');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}/versions/1.0.0`, await cookieFor(contributorId));
    expect(res.status).toBe(204);
  });

  it('上传者本人删自己的 REJECTED → 403（已进审核留档——管理面）', async () => {
    const { slug } = await mkVersioned(contributorId, 'REJECTED', 'REJECTED');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}/versions/1.0.0`, await cookieFor(contributorId));
    expect(res.status).toBe(403);
  });

  it('owner 删 REJECTED → 204 + 连带 review_task 行清', async () => {
    const { assetId, slug } = await mkVersioned(contributorId, 'REJECTED', 'REJECTED');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}/versions/1.0.0`, await cookieFor(ownerId));
    expect(res.status).toBe(204);
    const tasks = await db.select({ id: reviewTask.id }).from(reviewTask).where(eq(reviewTask.assetVersionId, assetId));
    expect(tasks).toHaveLength(0); // 版本删除连带清任务行
  });

  it('空间 ADMIN（非 owner 非上传者）删 UPLOADED → 204（管理面）', async () => {
    const { slug } = await mkVersioned(contributorId, 'UPLOADED', 'WITHDRAWN');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}/versions/1.0.0`, await cookieFor(adminId));
    expect(res.status).toBe(204);
  });

  it('owner 删 PENDING_REVIEW → 400 version_not_deletable（审核中禁删——防内容蒸发）', async () => {
    const { slug } = await mkVersioned(contributorId, 'PENDING_REVIEW', 'PENDING');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}/versions/1.0.0`, await cookieFor(ownerId));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('asset.version_not_deletable');
  });

  it('owner 删 YANKED → 400 version_not_deletable（留档态）', async () => {
    const { slug } = await mkVersioned(contributorId, 'YANKED');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}/versions/1.0.0`, await cookieFor(ownerId));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('asset.version_not_deletable');
  });

  it('stranger（非成员非上传者）删 DRAFT → 403 auth.forbidden', async () => {
    const { slug } = await mkVersioned(contributorId, 'DRAFT');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}/versions/1.0.0`, await cookieFor(strangerId));
    expect(res.status).toBe(403);
  });
});

describe('资产删除条件升级（design §4.2 R10）', () => {
  it('有 YANKED 版本 → 400 has_yanked（曾分发即留档——资产不可删）', async () => {
    const { slug } = await mkVersioned(contributorId, 'YANKED');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}`, await cookieFor(ownerId));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('asset.has_yanked');
  });

  it('仅 DRAFT（无 PUBLISHED/YANKED）→ 204 可删', async () => {
    const { slug } = await mkVersioned(contributorId, 'DRAFT');
    const res = await delReq(`/api/assets/${PREFIX}ns/${slug}`, await cookieFor(ownerId));
    expect(res.status).toBe(204);
  });
});
