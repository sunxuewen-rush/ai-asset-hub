import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray, like } from 'drizzle-orm';
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
import { hashToken } from '../auth/tokens.js';
import { createClient, type Db } from '../db/client.js';
import {
  apiToken,
  asset,
  auditLog,
  namespace,
  namespaceMember,
  type RoleCode,
  role,
  userAccount,
  userRoleBinding,
} from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { createAuditRoutes } from './audit.js';
import { rbacContext } from './auth-middleware.js';
import { tokenAuthMiddleware } from './token-middleware.js';
import { createTokenRoutes } from './tokens.js';

const PREFIX = 'tks-';
let db: Db;
let sessions: SessionManager;
let rbac: RbacService;
let auditorId: string;
let superAdminId: string;
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
  await db
    .insert(role)
    .values({ code, name: `r-${code}`, isSystem: true })
    .onConflictDoNothing();
}
async function bindRole(userId: string, code: RoleCode) {
  const rows = await db.select().from(role).where(eq(role.code, code));
  await db.insert(userRoleBinding).values({ userId, roleId: rows[0]!.id });
}
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'tks-http');
  return `aih_session=${sid}`;
}
async function issueToken(userId: string, scope?: string[]): Promise<string> {
  const res = await buildApp().request('/api/tokens', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      cookie: await cookieFor(userId),
    },
    body: JSON.stringify(scope === undefined ? {} : { scope }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { token: string }).token;
}
async function insertTokenRow(userId: string, scope: string): Promise<string> {
  const plain = `aih_${PREFIX}${randomUUID()}`;
  await db.insert(apiToken).values({ userId, tokenHash: hashToken(plain), scope });
  return plain;
}
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', tokenAuthMiddleware(db));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
  app.onError((err, c) => {
    if (err instanceof AuthError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    if (err instanceof AssetError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/tokens', createTokenRoutes({ db, audit }));
  app.route('/api/audit', createAuditRoutes({ db }));
  app.route('/api/assets', createAssetRoutes({ db, audit, storage, uploadRateLimiter }));
  return app;
}
async function apiAudit(token: string): Promise<Response> {
  return buildApp().request('/api/audit?limit=1', {
    method: 'GET',
    headers: { host: 'localhost:3000', authorization: `Bearer ${token}` },
  });
}
async function apiRegister(token: string): Promise<Response> {
  return buildApp().request('/api/assets', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      namespaceSlug: 'tks-ns',
      slug: `scope-a-${randomUUID().slice(0, 6)}`,
      type: 'skill',
    }),
  });
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'tks-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max);
  auditorId = await makeUser('auditor');
  superAdminId = await makeUser('sa');
  await ensureRole('AUDITOR');
  await ensureRole('SUPER_ADMIN');
  await bindRole(auditorId, 'AUDITOR');
  await bindRole(superAdminId, 'SUPER_ADMIN');
  // 注册端点的权限门在 ns 寻址后——建 ns 使 scope 判定真触发
  await db
    .insert(namespace)
    .values({ slug: 'tks-ns', displayName: 'tks-ns', type: 'TEAM', createdBy: superAdminId });
  const [nsRow] = await db
    .select({ id: namespace.id })
    .from(namespace)
    .where(eq(namespace.slug, 'tks-ns'));
  await db
    .insert(namespaceMember)
    .values({ namespaceId: nsRow!.id, userId: superAdminId, role: 'OWNER' });
});

afterAll(async () => {
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.id, `${PREFIX}%`));
  await db.delete(apiToken).where(like(apiToken.userId, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  const ownedAssets = await db
    .select({ id: asset.id })
    .from(asset)
    .where(like(asset.ownerId, `${PREFIX}%`));
  if (ownedAssets.length > 0)
    await db.delete(asset).where(
      inArray(
        asset.id,
        ownedAssets.map((a) => a.id),
      ),
    );
  await db.delete(namespaceMember).where(like(namespaceMember.userId, `${PREFIX}%`));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  for (const u of users) {
    await db.delete(userRoleBinding).where(eq(userRoleBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await rm(storageDir, { recursive: true, force: true });
  await db.$client.end();
});

describe('Token scope 交集过滤（design §8 R14）', () => {
  it("签发 scope=['audit:read'] → 列表回显 scope", async () => {
    const token = await issueToken(auditorId, ['audit:read']);
    const res = await buildApp().request('/api/tokens', {
      method: 'GET',
      headers: { host: 'localhost:3000', cookie: await cookieFor(auditorId) },
    });
    const body = (await res.json()) as { items: Array<{ scope: string }> };
    expect(body.items.some((t) => t.scope === 'audit:read')).toBe(true);
    void token;
  });

  it('scope 含 audit:read → audit 端点 200（RBAC 过 + scope 交集过）', async () => {
    const token = await issueToken(auditorId, ['audit:read']);
    const res = await apiAudit(token);
    expect(res.status).toBe(200);
  });

  it('scope 不含 audit:read（仅 asset:publish）→ audit 403（交集拒——RBAC 有权限但 scope 无码）', async () => {
    const token = await issueToken(auditorId, ['asset:publish']);
    const res = await apiAudit(token);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('auth.forbidden');
  });

  it("scope 缺省（''）→ 全量：audit 200（M1 零破坏）", async () => {
    const token = await issueToken(auditorId);
    const res = await apiAudit(token);
    expect(res.status).toBe(200);
  });

  it("scope 'cli'（Device Flow）→ 全量：audit 200（05 §5 兼容语义）", async () => {
    const plain = await insertTokenRow(auditorId, 'cli');
    const res = await buildApp().request('/api/audit?limit=1', {
      method: 'GET',
      headers: { host: 'localhost:3000', authorization: `Bearer ${plain}` },
    });
    expect(res.status).toBe(200);
  });

  it('非法 scope 码（非十权限值）→ 400 request.invalid', async () => {
    const res = await buildApp().request('/api/tokens', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        'content-type': 'application/json',
        cookie: await cookieFor(auditorId),
      },
      body: JSON.stringify({ scope: ['nope:code'] }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('request.invalid');
  });

  it('手写 can 点（资产注册）：超管 token scope 仅 audit:read → 注册 403（R14 交集含超管）', async () => {
    const token = await issueToken(superAdminId, ['audit:read']);
    const res = await apiRegister(token);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('auth.forbidden');
  });

  it('手写 can 点：超管 token 缺省 scope → 注册 201（scope 全量放行 + RBAC 超管短路）', async () => {
    const token = await issueToken(superAdminId);
    const res = await apiRegister(token);
    expect(res.status).toBe(201);
  });
});
