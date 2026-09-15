import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
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

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AssetError } from '../assets/errors.js';
import { createAuditWriter } from '../audit/audit.js';
import { type AihAuth, createAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import { InMemoryRateLimiter } from '../auth/rate-limit.js';
import { ACCOUNT_ROLE, type AccountRole, RbacService } from '../auth/rbac.js';
import { createClient, type Db } from '../db/client.js';
import { asset, auditLog, labelDefinition, user } from '../db/schema/index.js';
import { LabelError } from '../labels/errors.js';
import { ReviewError } from '../review/errors.js';
import { createLocalStorage } from '../storage/local.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { createLabelRoutes } from './labels.js';

const PREFIX = 'lat-';
let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let superAdmin: string;
let ownerId: string; // 资产 owner
let memberId: string; // 普通用户（非 owner——他人资产无管理权）
let adminId: string; // 管理档
let strangerId: string;
let audit!: ReturnType<typeof createAuditWriter>;
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
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
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    if (err instanceof AssetError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    if (err instanceof ReviewError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    if (err instanceof LabelError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404 | 409);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  app.route('/api/labels', createLabelRoutes({ db, audit }));
  return app;
}
const ORIGIN = { origin: 'http://localhost:3000' };
async function putDel(method: string, url: string, cookie: string) {
  return buildApp().request(url, {
    method,
    headers: { host: 'localhost:3000', ...ORIGIN, cookie },
  });
}
const put = (u: string, c: string) => putDel('PUT', u, c);
const del = (u: string, c: string) => putDel('DELETE', u, c);
async function getAssetDetail(slug: string) {
  return buildApp().request(`/api/assets/${slug}`, {
    method: 'GET',
    headers: { host: 'localhost:3000', ...ORIGIN },
  });
}

let seq = 0;
let assetSlug: string;

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'lat-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max);
  superAdmin = await makeUser('sa');
  ownerId = await makeUser('owner');
  memberId = await makeUser('member');
  adminId = await makeUser('admin');
  strangerId = await makeUser('stranger');
  await setRole(superAdmin, ACCOUNT_ROLE.SUPER_ADMIN);
  await setRole(adminId, ACCOUNT_ROLE.ADMIN); // 管理档（原空间 ADMIN 面并入）
  assetSlug = `${PREFIX}a${++seq}`;
  await db.insert(asset).values({ slug: assetSlug, type: 'skill', ownerId });
});

afterAll(async () => {
  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.id, `${PREFIX}%`));
  await db.delete(asset).where(eq(asset.ownerId, ownerId));
  await db.delete(labelDefinition).where(like(labelDefinition.createdBy, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  for (const u of users) {
    await cleanupCreatedUsers(db);
  }
  await rm(storageDir, { recursive: true, force: true });
  await db.$client.end();
});

async function seedLabel(slug: string, type: 'RECOMMENDED' | 'PRIVILEGED' = 'RECOMMENDED') {
  const [r] = await db
    .insert(labelDefinition)
    .values({ slug, type, createdBy: superAdmin })
    .returning({ id: labelDefinition.id });
  return r!.id;
}

describe('资产挂载 API（06 §3/§5.3 + design §5 R11）', () => {
  it('RECOMMENDED：owner 挂载 → 204 + 详情 labels[] 出现', async () => {
    const lab = `rec-${++seq}`;
    await seedLabel(lab);
    const res = await put(`/api/assets/${assetSlug}/labels/${lab}`, await cookieFor(ownerId));
    expect(res.status).toBe(204);
    const detail = (await (await getAssetDetail(assetSlug)).json()) as { labels: string[] };
    expect(detail.labels).toContain(lab);
  });

  it('RECOMMENDED：管理档（非 owner）可挂', async () => {
    const lab = `adm-${++seq}`;
    await seedLabel(lab);
    const res = await put(`/api/assets/${assetSlug}/labels/${lab}`, await cookieFor(adminId));
    expect(res.status).toBe(204);
  });

  it('RECOMMENDED：普通用户非 owner 挂他人资产 → 403 label.access_denied', async () => {
    const lab = `denied-${++seq}`;
    await seedLabel(lab);
    const res = await put(`/api/assets/${assetSlug}/labels/${lab}`, await cookieFor(memberId));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('label.access_denied');
  });

  it('PRIVILEGED：owner 挂 → 403；SUPER_ADMIN 挂 → 204', async () => {
    const lab = `priv-${++seq}`;
    await seedLabel(lab, 'PRIVILEGED');
    const ownerRes = await put(`/api/assets/${assetSlug}/labels/${lab}`, await cookieFor(ownerId));
    expect(ownerRes.status).toBe(403);
    const saRes = await put(`/api/assets/${assetSlug}/labels/${lab}`, await cookieFor(superAdmin));
    expect(saRes.status).toBe(204);
  });

  it('label 不存在 → 404 label.not_found', async () => {
    const res = await put(`/api/assets/${assetSlug}/labels/ghost-label`, await cookieFor(ownerId));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe('label.not_found');
  });

  it('重复挂幂等 200（204 同语义——不报错不重复行）', async () => {
    const lab = `dup-${++seq}`;
    await seedLabel(lab);
    const ownerCookie = await cookieFor(ownerId);
    const first = await put(`/api/assets/${assetSlug}/labels/${lab}`, ownerCookie);
    expect(first.status).toBe(204);
    const second = await put(`/api/assets/${assetSlug}/labels/${lab}`, ownerCookie);
    expect(second.status).toBe(204);
  });

  it('>10 上限 → 400 label.limit_exceeded', async () => {
    const overAsset = `${PREFIX}over${++seq}`;
    await db.insert(asset).values({ slug: overAsset, type: 'skill', ownerId });
    const ownerCookie = await cookieFor(ownerId);
    for (let i = 0; i < 10; i++) {
      const lab = `full-${i}-${++seq}`;
      await seedLabel(lab);
      const r = await put(`/api/assets/${overAsset}/labels/${lab}`, ownerCookie);
      expect(r.status).toBe(204);
    }
    const extra = `full-extra-${++seq}`;
    await seedLabel(extra);
    const res = await put(`/api/assets/${overAsset}/labels/${extra}`, ownerCookie);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('label.limit_exceeded');
  });

  it('移除：owner 移除 → 204 + 详情 labels[] 消失；不存在挂载幂等 204', async () => {
    const lab = `rm-${++seq}`;
    await seedLabel(lab);
    const ownerCookie = await cookieFor(ownerId);
    await put(`/api/assets/${assetSlug}/labels/${lab}`, ownerCookie);
    const res = await del(`/api/assets/${assetSlug}/labels/${lab}`, ownerCookie);
    expect(res.status).toBe(204);
    const detail = (await (await getAssetDetail(assetSlug)).json()) as { labels: string[] };
    expect(detail.labels).not.toContain(lab);
    const again = await del(`/api/assets/${assetSlug}/labels/${lab}`, ownerCookie);
    expect(again.status).toBe(204); // 幂等
  });

  it('stranger 挂载 → 403（非 owner 无管理权）', async () => {
    const lab = `str-${++seq}`;
    await seedLabel(lab);
    const res = await put(`/api/assets/${assetSlug}/labels/${lab}`, await cookieFor(strangerId));
    expect(res.status).toBe(403);
  });
});
