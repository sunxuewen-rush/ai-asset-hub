import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { mkdtemp, rm } from 'node:fs/promises';
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
  asset,
  auditLog,
  labelDefinition,
  namespace,
  namespaceMember,
  role,
  userAccount,
  userRoleBinding,
  type RoleCode,
} from '../db/schema/index.js';
import { LabelError } from '../labels/errors.js';
import { ReviewError } from '../review/errors.js';
import { createLocalStorage } from '../storage/local.js';
import { rbacContext } from './auth-middleware.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { createLabelRoutes } from './labels.js';

const PREFIX = 'lat-';
let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let superAdmin: string;
let ownerId: string; // 资产 owner（ns OWNER）
let memberId: string; // ns MEMBER（非 owner——资产上传者/他人资产无管理权）
let adminId: string; // 空间 ADMIN
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
async function bindRole(userId: string, code: RoleCode) {
  const rows = await db.select().from(role).where(eq(role.code, code));
  await db.insert(userRoleBinding).values({ userId, roleId: rows[0]!.id });
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'lat-http');
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
    if (err instanceof LabelError) return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404 | 409);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  app.route('/api/labels', createLabelRoutes({ db, audit }));
  return app;
}
const ORIGIN = { origin: 'http://localhost:3000' };
async function putDel(method: string, url: string, cookie: string) {
  return buildApp().request(url, { method, headers: { host: 'localhost:3000', ...ORIGIN, cookie } });
}
const put = (u: string, c: string) => putDel('PUT', u, c);
const del = (u: string, c: string) => putDel('DELETE', u, c);
async function getAssetDetail(slug: string) {
  return buildApp().request(`/api/assets/${PREFIX}ns/${slug}`, { method: 'GET', headers: { host: 'localhost:3000', ...ORIGIN } });
}

let seq = 0;
let assetSlug: string;

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'lat-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max);
  superAdmin = await makeUser('sa');
  ownerId = await makeUser('owner');
  memberId = await makeUser('member');
  adminId = await makeUser('admin');
  strangerId = await makeUser('stranger');
  await ensureRole('SUPER_ADMIN');
  await bindRole(superAdmin, 'SUPER_ADMIN');
  const [ns] = await db
    .insert(namespace)
    .values({ slug: `${PREFIX}ns`, displayName: `${PREFIX}ns`, type: 'TEAM', createdBy: ownerId })
    .returning({ id: namespace.id });
  nsId = ns!.id;
  await db.insert(namespaceMember).values([
    { namespaceId: nsId, userId: ownerId, role: 'OWNER' },
    { namespaceId: nsId, userId: memberId, role: 'MEMBER' },
    { namespaceId: nsId, userId: adminId, role: 'ADMIN' },
  ]);
  assetSlug = `${PREFIX}a${++seq}`;
  await db.insert(asset).values({ namespaceId: nsId, slug: assetSlug, type: 'skill', ownerId });
});

afterAll(async () => {
  const users = await db.select({ id: userAccount.id }).from(userAccount).where(like(userAccount.id, `${PREFIX}%`));
  await db.delete(asset).where(eq(asset.ownerId, ownerId));
  await db.delete(labelDefinition).where(like(labelDefinition.createdBy, `${PREFIX}%`));
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
    const res = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, await cookieFor(ownerId));
    expect(res.status).toBe(204);
    const detail = (await (await getAssetDetail(assetSlug)).json()) as { labels: string[] };
    expect(detail.labels).toContain(lab);
  });

  it('RECOMMENDED：空间 ADMIN（非 owner）可挂', async () => {
    const lab = `adm-${++seq}`;
    await seedLabel(lab);
    const res = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, await cookieFor(adminId));
    expect(res.status).toBe(204);
  });

  it('RECOMMENDED：MEMBER 非 owner 挂他人资产 → 403 label.access_denied', async () => {
    const lab = `denied-${++seq}`;
    await seedLabel(lab);
    const res = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, await cookieFor(memberId));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('label.access_denied');
  });

  it('PRIVILEGED：owner 挂 → 403；SUPER_ADMIN 挂 → 204', async () => {
    const lab = `priv-${++seq}`;
    await seedLabel(lab, 'PRIVILEGED');
    const ownerRes = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, await cookieFor(ownerId));
    expect(ownerRes.status).toBe(403);
    const saRes = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, await cookieFor(superAdmin));
    expect(saRes.status).toBe(204);
  });

  it('label 不存在 → 404 label.not_found', async () => {
    const res = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/ghost-label`, await cookieFor(ownerId));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe('label.not_found');
  });

  it('重复挂幂等 200（204 同语义——不报错不重复行）', async () => {
    const lab = `dup-${++seq}`;
    await seedLabel(lab);
    const ownerCookie = await cookieFor(ownerId);
    const first = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, ownerCookie);
    expect(first.status).toBe(204);
    const second = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, ownerCookie);
    expect(second.status).toBe(204);
  });

  it('>10 上限 → 400 label.limit_exceeded', async () => {
    const overAsset = `${PREFIX}over${++seq}`;
    await db.insert(asset).values({ namespaceId: nsId, slug: overAsset, type: 'skill', ownerId });
    const ownerCookie = await cookieFor(ownerId);
    for (let i = 0; i < 10; i++) {
      const lab = `full-${i}-${++seq}`;
      await seedLabel(lab);
      const r = await put(`/api/assets/${PREFIX}ns/${overAsset}/labels/${lab}`, ownerCookie);
      expect(r.status).toBe(204);
    }
    const extra = `full-extra-${++seq}`;
    await seedLabel(extra);
    const res = await put(`/api/assets/${PREFIX}ns/${overAsset}/labels/${extra}`, ownerCookie);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('label.limit_exceeded');
  });

  it('移除：owner 移除 → 204 + 详情 labels[] 消失；不存在挂载幂等 204', async () => {
    const lab = `rm-${++seq}`;
    await seedLabel(lab);
    const ownerCookie = await cookieFor(ownerId);
    await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, ownerCookie);
    const res = await del(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, ownerCookie);
    expect(res.status).toBe(204);
    const detail = (await (await getAssetDetail(assetSlug)).json()) as { labels: string[] };
    expect(detail.labels).not.toContain(lab);
    const again = await del(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, ownerCookie);
    expect(again.status).toBe(204); // 幂等
  });

  it('stranger 挂载 → 403（无成员关系非 owner）', async () => {
    const lab = `str-${++seq}`;
    await seedLabel(lab);
    const res = await put(`/api/assets/${PREFIX}ns/${assetSlug}/labels/${lab}`, await cookieFor(strangerId));
    expect(res.status).toBe(403);
  });
});
