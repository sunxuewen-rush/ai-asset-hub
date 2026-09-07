import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createAuditWriter } from '../audit/audit.js';
import { csrfProtection } from '../auth/csrf.js';
import { AuthError } from '../auth/errors.js';
import { PERMISSIONS } from '../auth/permissions.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { hashToken } from '../auth/tokens.js';
import { createClient, type Db } from '../db/client.js';
import {
  apiToken,
  auditLog,
  permission,
  type RoleCode,
  role,
  rolePermission,
  userAccount,
  userRoleBinding,
} from '../db/schema/index.js';
import { createAuditRoutes } from './audit.js';
import { rbacContext } from './auth-middleware.js';
import { tokenAuthMiddleware } from './token-middleware.js';

let db: Db;
let sessions: SessionManager;
let rbac: RbacService;

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

async function ensureRole(roleCode: RoleCode) {
  await db
    .insert(role)
    .values({ code: roleCode, name: `role-${roleCode}`, isSystem: true })
    .onConflictDoNothing();
}

/** 角色绑权限（05 §6.4：AUDITOR → audit:read）+ 用户绑角色 */
async function grantRolePermission(userId: string, roleCode: RoleCode, permCode: string) {
  await ensureRole(roleCode);
  await db
    .insert(permission)
    .values({ code: permCode, name: `perm-${permCode}`, groupCode: permCode.split(':')[0] })
    .onConflictDoNothing();
  const [roleRow] = await db.select().from(role).where(eq(role.code, roleCode));
  const [permRow] = await db.select().from(permission).where(eq(permission.code, permCode));
  await db
    .insert(rolePermission)
    .values({ roleId: roleRow!.id, permissionId: permRow!.id })
    .onConflictDoNothing();
  await db.insert(userRoleBinding).values({ userId, roleId: roleRow!.id });
}

async function mintToken(userId: string): Promise<string> {
  const plain = `aih_${randomUUID()}${randomUUID()}`.slice(0, 47);
  await db.insert(apiToken).values({ userId, tokenHash: hashToken(plain), scope: '' });
  return plain;
}

function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', tokenAuthMiddleware(db));
  app.use('*', sessionMiddleware(sessions));
  app.use('*', csrfProtection({}));
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 409 | 429,
      );
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.route('/api/audit', createAuditRoutes({ db }));
  return app;
}

let actor: string; // 审计事件 actor（displayName au-actor，避免与路由测试用户混淆清理）
let auditor: string;
let superAdmin: string;
let plain: string;

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));

  // 路由权限角色
  auditor = await makeUser('au-auditor');
  superAdmin = await makeUser('au-super-admin');
  plain = await makeUser('au-plain');
  await grantRolePermission(auditor, 'AUDITOR', PERMISSIONS.auditRead);
  await ensureRole('SUPER_ADMIN');
  await db.insert(userRoleBinding).values({
    userId: superAdmin,
    roleId: (await db.select().from(role).where(eq(role.code, 'SUPER_ADMIN')))[0]!.id,
  });

  // 审计事件数据（requestId au-% 前缀精确清理）
  actor = await makeUser('au-actor');
  const write = createAuditWriter(db);
  await write({
    actorId: actor,
    action: 'auth.login.success',
    targetType: 'user',
    targetId: actor,
    requestId: 'au-ev-1',
    clientIp: '10.9.9.1',
  });
  await write({
    actorId: actor,
    action: 'auth.logout',
    targetType: 'user',
    targetId: actor,
    requestId: 'au-ev-2',
    clientIp: '10.9.9.1',
  });
  await write({ action: 'auth.login.failed', requestId: 'au-ev-3', clientIp: '10.9.9.9' });
});

afterAll(async () => {
  const logs = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(like(auditLog.requestId, 'au-%'));
  for (const l of logs) {
    await db.delete(auditLog).where(eq(auditLog.id, l.id));
  }
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'au-%'));
  for (const u of users) {
    await db.delete(apiToken).where(eq(apiToken.userId, u.id));
    await db.delete(userRoleBinding).where(eq(userRoleBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'audit-test');
  return `aih_session=${sid}`;
}

describe('GET /api/audit（T20 浏览 + T21 权限面闭环）', () => {
  it('匿名 → 401', async () => {
    const res = await buildApp().request('/api/audit');
    expect(res.status).toBe(401);
  });

  it('普通用户（无 audit:read）→ 403 auth.forbidden', async () => {
    const res = await buildApp().request('/api/audit', {
      headers: { cookie: await cookieFor(plain) },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('auth.forbidden');
  });

  it('AUDITOR → 200 {items,total,limit,offset}', async () => {
    const res = await buildApp().request('/api/audit', {
      headers: { cookie: await cookieFor(auditor) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: Array<{ requestId: string }>;
      total: number;
      limit: number;
      offset: number;
    };
    expect(body.total).toBeGreaterThanOrEqual(3);
    expect(body.limit).toBe(20);
    expect(body.offset).toBe(0);
    // 倒序：au-ev-3 最新在前（本批 3 条互不干扰其他 run）
    expect(body.items[0]!.requestId).toBe('au-ev-3');
  });

  it('SUPER_ADMIN → 200（短路放行）', async () => {
    const res = await buildApp().request('/api/audit', {
      headers: { cookie: await cookieFor(superAdmin) },
    });
    expect(res.status).toBe(200);
  });

  it('Bearer 通道 AUDITOR 同判 → 200（token/session 同一 requirePermission）', async () => {
    const token = await mintToken(auditor);
    const res = await buildApp().request('/api/audit', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it('Bearer 通道普通用户 → 403（同判负例）', async () => {
    const token = await mintToken(plain);
    const res = await buildApp().request('/api/audit', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('过滤：action=logout → 只返回 logout 事件', async () => {
    const res = await buildApp().request('/api/audit?action=auth.logout', {
      headers: { cookie: await cookieFor(auditor) },
    });
    const body = (await res.json()) as { items: Array<{ action: string }>; total: number };
    expect(body.total).toBeGreaterThanOrEqual(1);
    for (const item of body.items) {
      expect(item.action).toBe('auth.logout');
    }
  });

  it('分页参数生效：limit=1 → 1 条 + total 全量', async () => {
    const res = await buildApp().request('/api/audit?limit=1', {
      headers: { cookie: await cookieFor(auditor) },
    });
    const body = (await res.json()) as { items: unknown[]; total: number; limit: number };
    expect(body.items).toHaveLength(1);
    expect(body.limit).toBe(1);
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  it('非法参数 → 400 request.invalid（limit=101 / offset=-1 / from 非 ISO）', async () => {
    for (const qs of ['limit=101', 'offset=-1', 'from=not-a-date']) {
      const res = await buildApp().request(`/api/audit?${qs}`, {
        headers: { cookie: await cookieFor(auditor) },
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('request.invalid');
    }
  });

  it('时间窗过滤 from/to（ISO）→ 窗内事件可见', async () => {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 3600_000).toISOString();
    const res = await buildApp().request(
      `/api/audit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&action=auth.login.failed`,
      {
        headers: { cookie: await cookieFor(auditor) },
      },
    );
    const body = (await res.json()) as { items: Array<{ requestId: string }>; total: number };
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.items[0]!.requestId).toBe('au-ev-3');
  });
});
