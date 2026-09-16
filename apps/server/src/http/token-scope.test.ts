import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';
import {
  cleanupCreatedUsers,
  createTestUser,
  mintApiKey,
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
import { asset, auditLog, user } from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './assets.js';
import { createAuditRoutes } from './audit.js';
import { officialSessionMiddleware, rbacContext } from './auth-middleware.js';
import { tokenAuthMiddleware } from './token-middleware.js';
import { createTokenRoutes } from './tokens.js';

const PREFIX = 'tks-';
let db: Db;
let auth: AihAuth;
let rbac: RbacService;
let auditorId: string;
let superAdminId: string;
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
async function issueToken(userId: string, scope?: string[]): Promise<string> {
  const res = await buildApp().request('/api/tokens', {
    method: 'POST',
    headers: {
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
      cookie: await cookieFor(userId),
    },
    // M4b-3：名称必填（2026-09-16 契约变更）⇒ 造数请求体补 name
    body: JSON.stringify({ name: 'scope-test', ...(scope === undefined ? {} : { scope }) }),
  });
  expect(res.status).toBe(201);
  return ((await res.json()) as { token: string }).token;
}
/**
 * 造「全量」令牌（T4：官方 `permissions` 为 NULL = 全量）。
 * 历史 `scope=''`/`'cli'` 两种全量来源在迁移后同为 NULL（design §5.3/§8）⇒ 本测试用同一形态覆盖。
 */
async function mintFullToken(userId: string): Promise<string> {
  const { plain } = await mintApiKey(auth, userId, { scope: null });
  return plain;
}
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', tokenAuthMiddleware(db, auth));
  app.use('*', officialSessionMiddleware(auth));
  app.onError((err, c) => {
    if (err instanceof AuthError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 401 | 403);
    if (err instanceof AssetError)
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/tokens', createTokenRoutes({ db, auth, audit }));
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
      slug: `scope-a-${randomUUID().slice(0, 6)}`,
      type: 'skill',
    }),
  });
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  auth = createAuth({ ldap: null });
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'tks-storage-'));
  storage = createLocalStorage(storageDir);
  uploadRateLimiter = new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max);
  auditorId = await makeUser('auditor');
  superAdminId = await makeUser('sa');
  await setRole(auditorId, ACCOUNT_ROLE.ADMIN);
  await setRole(superAdminId, ACCOUNT_ROLE.SUPER_ADMIN);
});

afterAll(async () => {
  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.id, `${PREFIX}%`));
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
  for (const u of users) {
    await cleanupCreatedUsers(db);
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

  it("历史 scope 'cli'（设备令牌）→ 迁移后全量：audit 200（05 §5 兼容语义）", async () => {
    const plain = await mintFullToken(auditorId);
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
