import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { AuthError } from '../auth/errors.js';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_NAMES,
  PERMISSIONS,
} from '../auth/permissions.js';
import { RbacService } from '../auth/rbac.js';
import { InMemorySessionStore, SessionManager } from '../auth/session.js';
import { sessionMiddleware } from '../auth/session-middleware.js';
import { createClient, type Db } from '../db/client.js';
import {
  permission,
  type RoleCode,
  role,
  rolePermission,
  userAccount,
  userRoleBinding,
} from '../db/schema/index.js';
import {
  rbacContext,
  requireAuth,
  requirePermission,
  requirePlatformRole,
} from './auth-middleware.js';

let db: Db;
let rbac: RbacService;
let sessions: SessionManager;

/** 幂等基线：角色 4 + 权限 10 + 绑定（seed 同源常量） */
async function seedBaseline(): Promise<void> {
  for (const code of ALL_PERMISSIONS) {
    await db
      .insert(permission)
      .values({ code, name: PERMISSION_NAMES[code], groupCode: PERMISSION_GROUPS[code] })
      .onConflictDoNothing();
  }
  const roles = await db.select().from(role);
  if (roles.length === 0) {
    await db.insert(role).values([
      { code: 'SUPER_ADMIN', name: '超级管理员', isSystem: true },
      { code: 'ASSET_ADMIN', name: '资产管理员', isSystem: true },
      { code: 'USER_ADMIN', name: '用户管理员', isSystem: true },
      { code: 'AUDITOR', name: '审计员', isSystem: true },
    ]);
  }
  const assetAdmin = await db.select().from(role).where(eq(role.code, 'ASSET_ADMIN'));
  const perms = await db.select().from(permission);
  const permIdByCode = new Map(perms.map((p) => [p.code, p.id]));
  const assetPerms = [
    PERMISSIONS.assetPublish,
    PERMISSIONS.reviewSubmit,
    PERMISSIONS.assetManage,
    PERMISSIONS.assetPromote,
    PERMISSIONS.reviewApprove,
    PERMISSIONS.promotionApprove,
  ];
  for (const code of assetPerms) {
    await db
      .insert(rolePermission)
      .values({ roleId: assetAdmin[0]!.id, permissionId: permIdByCode.get(code)! })
      .onConflictDoNothing();
  }
  // AUDITOR 绑定 audit:read
  const auditor = await db.select().from(role).where(eq(role.code, 'AUDITOR'));
  await db
    .insert(rolePermission)
    .values({ roleId: auditor[0]!.id, permissionId: permIdByCode.get(PERMISSIONS.auditRead)! })
    .onConflictDoNothing();
}

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

async function bindRole(userId: string, roleCode: RoleCode): Promise<void> {
  const rows = await db.select().from(role).where(eq(role.code, roleCode));
  await db.insert(userRoleBinding).values({ userId, roleId: rows[0]!.id });
}

/** 造登录态：session manager 直签 → cookie 头 */
async function cookieFor(userId: string): Promise<string> {
  const sid = await sessions.createSession(userId, 'mw-test');
  return `aih_session=${sid}`;
}

/** 测试 app：session 中间件 + rbac 注入 + 三个探针端点 */
function buildApp(): Hono {
  const app = new Hono();
  app.use('*', rbacContext(rbac));
  app.use('*', sessionMiddleware(sessions));
  // onError：AuthError 结构化（与 createApp 同款）
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 409 | 429,
      );
    }
    return c.json({ code: 'internal_error' }, 500);
  });
  app.get('/probe-auth', requireAuth(), (c) => c.json({ ok: true }));
  app.get('/probe-perm', requirePermission(PERMISSIONS.auditRead), (c) => c.json({ ok: true }));
  app.get('/probe-platform', requirePlatformRole(['ASSET_ADMIN']), (c) => c.json({ ok: true }));
  return app;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  await seedBaseline();
  rbac = new RbacService(db);
  sessions = new SessionManager(new InMemorySessionStore(60 * 60 * 1000));
});

afterAll(async () => {
  // 精确清理自己创建的测试用户（displayName 前缀；勿全表删 userRoleBinding——与其他测试文件并行互踩）
  const mine = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'mw-%'));
  for (const u of mine) {
    await db.delete(userRoleBinding).where(eq(userRoleBinding.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.$client.end();
});

describe('auth middleware', () => {
  it('requireAuth: no cookie → 401 session_expired', async () => {
    const res = await buildApp().request('/probe-auth');
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'auth.session_expired' });
  });

  it('requireAuth: valid session → 200', async () => {
    const uid = await makeUser('mw-plain');
    const res = await buildApp().request('/probe-auth', {
      headers: { cookie: await cookieFor(uid) },
    });
    expect(res.status).toBe(200);
  });

  it('requirePermission: plain user without role → 403 forbidden', async () => {
    const uid = await makeUser('mw-plain-perm');
    const app = buildApp();
    const res = await app.request('/probe-perm', {
      headers: { cookie: await cookieFor(uid) },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.forbidden' });
  });

  it('requirePermission: AUDITOR (bound audit:read) → 200', async () => {
    const uid = await makeUser('mw-auditor');
    await bindRole(uid, 'AUDITOR');
    const res = await buildApp().request('/probe-perm', {
      headers: { cookie: await cookieFor(uid) },
    });
    expect(res.status).toBe(200);
  });

  it('requirePlatformRole: ASSET_ADMIN → 200; plain user → 403', async () => {
    const admin = await makeUser('mw-asset-admin');
    await bindRole(admin, 'ASSET_ADMIN');
    const plain = await makeUser('mw-plain-platform');
    const app = buildApp();
    expect(
      (await app.request('/probe-platform', { headers: { cookie: await cookieFor(admin) } }))
        .status,
    ).toBe(200);
    expect(
      (await app.request('/probe-platform', { headers: { cookie: await cookieFor(plain) } }))
        .status,
    ).toBe(403);
  });

  it('SUPER_ADMIN short-circuits permission and platform role', async () => {
    const uid = await makeUser('mw-super');
    await bindRole(uid, 'SUPER_ADMIN');
    const app = buildApp();
    const cookie = await cookieFor(uid);
    expect((await app.request('/probe-perm', { headers: { cookie } })).status).toBe(200);
    expect((await app.request('/probe-platform', { headers: { cookie } })).status).toBe(200);
  });

  it('DISABLED user rejected at auth gate even with valid session', async () => {
    const uid = await makeUser('mw-disabled');
    await bindRole(uid, 'SUPER_ADMIN');
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, uid));
    const res = await buildApp().request('/probe-auth', {
      headers: { cookie: await cookieFor(uid) },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'auth.session_expired' });
  });
});
