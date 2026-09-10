import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { and, eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

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
  namespace,
  namespaceMember,
  userAccount,
  type VersionStatus,
} from '../db/schema/index.js';
import { ReviewError } from '../review/errors.js';
import { createLocalStorage } from '../storage/local.js';
import { buildSkillZip } from '../test-utils/zip-builder.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { rbacContext } from './auth-middleware.js';

const PREFIX = 'dwn-';
let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let ownerId: string;
let contributorId: string; // 上传者（MEMBER）
let assetAdminUserId: string; // 平台 ASSET_ADMIN
let strangerId: string;
let nsId: number;
let assetId: number;
let assetSlug: string;
let audit!: ReturnType<typeof createAuditWriter>;
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
let uploadRateLimiter!: InMemoryRateLimiter;
const bundleZip = Buffer.from(buildSkillZip());

async function makeUser(tag: string): Promise<string> {
  const id = `${PREFIX}${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}
async function setRole(userId: string, role: AccountRole): Promise<void> {
  await db.update(userAccount).set({ role }).where(eq(userAccount.id, userId));
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'dwn-http');
  return `aih_session=${sid}`;
}
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
  app.onError((err, c) => {
    if (err instanceof AuthError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    if (err instanceof AssetError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    if (err instanceof ReviewError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  return app;
}
const ORIGIN = { origin: 'http://localhost:3000' };
async function downloadReq(version: string, cookie?: string) {
  const headers: Record<string, string> = { host: 'localhost:3000', ...ORIGIN };
  if (cookie) headers.cookie = cookie;
  return buildApp().request(`/api/assets/${PREFIX}ns/${assetSlug}/versions/${version}/download`, {
    method: 'GET',
    headers,
  });
}

let versionSeq = 0;

/** 直插版本 + 真 bundle 落位（模拟上传完成——与 T13 createVersion 产物同构） */
async function seedPublishedVersion(status: VersionStatus, createdBy: string): Promise<string> {
  const version = `${versionSeq++}.0.0`;
  const [v] = await db
    .insert(assetVersion)
    .values({
      assetId,
      version,
      status,
      createdBy,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    })
    .returning({ id: assetVersion.id });
  const key = `${nsId}/${assetId}/${v!.id}/bundle.zip`;
  await storage.put(key, bundleZip, { contentType: 'application/zip' });
  await db.update(assetVersion).set({ bundleStorageKey: key }).where(eq(assetVersion.id, v!.id));
  return version;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'dwn-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max);
  ownerId = await makeUser('owner');
  contributorId = await makeUser('contributor');
  assetAdminUserId = await makeUser('assetadmin');
  strangerId = await makeUser('stranger');
  await setRole(assetAdminUserId, ACCOUNT_ROLE.ADMIN);
  const [ns] = await db
    .insert(namespace)
    .values({ slug: `${PREFIX}ns`, displayName: `${PREFIX}ns`, type: 'TEAM', createdBy: ownerId })
    .returning({ id: namespace.id });
  nsId = ns!.id;
  await db.insert(namespaceMember).values([
    { namespaceId: nsId, userId: ownerId, role: 'OWNER' },
    { namespaceId: nsId, userId: contributorId, role: 'MEMBER' },
  ]);
  assetSlug = `${PREFIX}a`;
  const [a] = await db
    .insert(asset)
    .values({ namespaceId: nsId, slug: assetSlug, type: 'skill', visibility: 'PUBLIC', ownerId })
    .returning({ id: asset.id });
  assetId = a!.id;
});

afterAll(async () => {
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.id, `${PREFIX}%`));
  // 本 ns 下全部资产（含 PRIVATE 用例附加资产）链删
  const allAssetIds = (
    await db.select({ id: asset.id }).from(asset).where(eq(asset.namespaceId, nsId))
  ).map((a) => a.id);
  if (allAssetIds.length > 0) {
    await db.delete(assetVersion).where(inArray(assetVersion.assetId, allAssetIds));
    await db.delete(asset).where(inArray(asset.id, allAssetIds));
  }
  await db.delete(namespaceMember).where(like(namespaceMember.userId, `${PREFIX}%`));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  for (const u of users) {
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await rm(storageDir, { recursive: true, force: true });
  await db.$client.end();
});

describe('下载五档授权（design §7.2 R13）', () => {
  it('PUBLISHED PUBLIC：匿名可下 → 200 zip 字节 + download_count +1', async () => {
    const version = await seedPublishedVersion('PUBLISHED', contributorId);
    const res = await downloadReq(version);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.toString('hex')).toBe(bundleZip.toString('hex')); // 原包字节一致
    const [a] = await db
      .select({ n: asset.downloadCount })
      .from(asset)
      .where(eq(asset.id, assetId));
    expect(a!.n).toBe(1);
  });

  it('YANKED → 400 asset.version_yanked（曾公开已撤回分发）', async () => {
    const version = await seedPublishedVersion('YANKED', contributorId);
    const res = await downloadReq(version);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('asset.version_yanked');
  });

  it('DRAFT/REJECTED → 400 asset.version_not_published（未公开留档族禁下）', async () => {
    const draft = await seedPublishedVersion('DRAFT', contributorId);
    const d = await downloadReq(draft);
    expect(d.status).toBe(400);
    expect(((await d.json()) as { code: string }).code).toBe('asset.version_not_published');
    const rejected = await seedPublishedVersion('REJECTED', contributorId);
    const r = await downloadReq(rejected);
    expect(r.status).toBe(400);
    expect(((await r.json()) as { code: string }).code).toBe('asset.version_not_published');
  });

  it('UPLOADED：owner 下载 200（withdraw 回退定稿自查——08 §7）; 陌生人 400', async () => {
    const version = await seedPublishedVersion('UPLOADED', contributorId);
    const ownerRes = await downloadReq(version, await cookieFor(ownerId));
    expect(ownerRes.status).toBe(200);
    const strangerRes = await downloadReq(version, await cookieFor(strangerId));
    expect(strangerRes.status).toBe(400);
    expect(((await strangerRes.json()) as { code: string }).code).toBe(
      'asset.version_not_published',
    );
  });

  it('UPLOADED：上传者本人（非 owner MEMBER）可下', async () => {
    const version = await seedPublishedVersion('UPLOADED', contributorId);
    const res = await downloadReq(version, await cookieFor(contributorId));
    expect(res.status).toBe(200);
  });

  it('PENDING_REVIEW：平台 ASSET_ADMIN 可下（审核人取真包）；陌生人 400', async () => {
    const version = await seedPublishedVersion('PENDING_REVIEW', contributorId);
    const adminRes = await downloadReq(version, await cookieFor(assetAdminUserId));
    expect(adminRes.status).toBe(200);
    const strangerRes = await downloadReq(version, await cookieFor(strangerId));
    expect(strangerRes.status).toBe(400);
  });

  it('PRIVATE 资产：陌生人下载 → 403 asset.access_denied（资产读面先行）', async () => {
    const privateSlug = `${PREFIX}p`;
    const [p] = await db
      .insert(asset)
      .values({
        namespaceId: nsId,
        slug: privateSlug,
        type: 'skill',
        visibility: 'PRIVATE',
        ownerId,
      })
      .returning({ id: asset.id });
    const [v] = await db
      .insert(assetVersion)
      .values({
        assetId: p!.id,
        version: '1.0.0',
        status: 'PUBLISHED',
        createdBy: contributorId,
        publishedAt: new Date(),
      })
      .returning({ id: assetVersion.id });
    const key = `${nsId}/${p!.id}/${v!.id}/bundle.zip`;
    await storage.put(key, bundleZip, { contentType: 'application/zip' });
    await db.update(assetVersion).set({ bundleStorageKey: key }).where(eq(assetVersion.id, v!.id));

    const res = await buildApp().request(
      `/api/assets/${PREFIX}ns/${privateSlug}/versions/1.0.0/download`,
      {
        method: 'GET',
        headers: { host: 'localhost:3000', ...ORIGIN, cookie: await cookieFor(strangerId) },
      },
    );
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('asset.access_denied');
  });
});
