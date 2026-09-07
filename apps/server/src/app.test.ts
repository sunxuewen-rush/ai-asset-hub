import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Hono } from 'hono';
import ldap from 'ldapjs';

// 集成测试：真实 PG（ai_asset_hub_test）+ 真实 HTTP 全链路（app.request）
process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { type AppDeps, createApp } from './app.js';
import { createAuditWriter } from './audit/audit.js';
import { LdapChannel } from './auth/ldap.js';
import { InMemoryRateLimiter } from './auth/rate-limit.js';
import { InMemorySessionStore, SessionManager } from './auth/session.js';
import { createClient, type Db } from './db/client.js';
import { auditLog, identityBinding, localCredential, userAccount } from './db/schema/index.js';

let db: Db;
// 跨用例共享：session manager + audit writer（同一进程内 cookie 语义连续）
let shared: { sessions: SessionManager; audit: ReturnType<typeof createAuditWriter> };

const LDAP_BASE = 'ou=people,dc=example,dc=com';

function startLdapServer(): Promise<{ server: ldap.Server; port: number }> {
  return new Promise((resolve) => {
    const server = ldap.createServer();
    server.bind(LDAP_BASE, (req: any, res: any) => {
      const dn = req.dn.toString().toLowerCase();
      const user = dn === `cn=alice,${LDAP_BASE}`.toLowerCase();
      if (user && req.credentials === 'ldap-pass-1') {
        res.end();
      } else {
        res.send(49);
      }
    });
    server.search(LDAP_BASE, (_req: any, res: any) => {
      res.end();
    });
    server.listen(0, '127.0.0.1', () => {
      const address = (server as unknown as { address: () => { port: number } }).address();
      resolve({ server, port: address.port });
    });
  });
}

function makeApp(depsOverrides?: Partial<AppDeps>): Hono {
  return createApp({
    db,
    sessions: shared.sessions,
    audit: shared.audit,
    rateLimiter: new InMemoryRateLimiter(60_000, 5),
    ldap: null,
    registrationEnabled: true,
    sessionTtlHours: 8,
    cookieSecure: false,
    ...depsOverrides,
  });
}

async function registerAndGetCookie(
  app: Hono,
  username: string,
  password = 'password-123',
): Promise<string> {
  const res = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
    body: JSON.stringify({ username, password, displayName: username }),
  });
  expect(res.status).toBe(201);
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = /aih_session=([^;]+)/.exec(setCookie);
  expect(match, 'session cookie present').not.toBeNull();
  return match![1]!;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  shared = {
    sessions: new SessionManager(new InMemorySessionStore(8 * 60 * 60 * 1000)),
    audit: createAuditWriter(db),
  };
});

afterAll(async () => {
  // 清理集成测试数据（顺序：audit_log → local_credential → identity_binding → user_account，FK 依赖）
  await db.delete(auditLog).where(like(auditLog.action, 'auth.%'));
  await db.delete(localCredential).where(like(localCredential.username, 'authit-%'));
  await db.delete(identityBinding).where(like(identityBinding.userId, 'authit-%'));
  await db.delete(identityBinding).where(eq(identityBinding.userId, 'alice'));
  await db.delete(userAccount).where(like(userAccount.displayName, 'authit-%'));
  await db.delete(userAccount).where(eq(userAccount.id, 'alice'));
  await db.$client.end();
});

describe('auth full flow (local, real PG)', () => {
  it('healthz returns ok', async () => {
    const res = await makeApp().request('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('register → me → logout → me 401', async () => {
    const app = makeApp();
    const sid = await registerAndGetCookie(app, 'authit-flow');
    const cookie = `aih_session=${sid}`;

    const me = await app.request('/api/auth/me', { headers: { cookie } });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as { user: { id: string; displayName: string } };
    expect(meBody.user.id.startsWith('usr_')).toBe(true);
    expect(meBody.user.displayName).toBe('authit-flow');

    const logout = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost:3000', host: 'localhost:3000' },
    });
    expect(logout.status).toBe(204);

    const meAfter = await app.request('/api/auth/me', { headers: { cookie } });
    expect(meAfter.status).toBe(401);
    expect(await meAfter.json()).toMatchObject({ code: 'auth.session_expired' });
  });

  it('login with correct password succeeds (case-insensitive)', async () => {
    const app = makeApp();
    await registerAndGetCookie(app, 'authit-login');
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      body: JSON.stringify({ username: 'AUTHIT-LOGIN', password: 'password-123' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('aih_session=');
  });

  it('login with wrong password returns 401 invalid_credentials', async () => {
    const app = makeApp();
    await registerAndGetCookie(app, 'authit-wrong');
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      body: JSON.stringify({ username: 'authit-wrong', password: 'not-the-password' }),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'auth.invalid_credentials' });
  });

  it('register rejects duplicate username (409)', async () => {
    const app = makeApp();
    await registerAndGetCookie(app, 'authit-dup');
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      body: JSON.stringify({ username: 'authit-dup', password: 'password-123' }),
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'auth.username_taken' });
  });

  it('csrf blocks non-GET without Origin', async () => {
    const res = await makeApp().request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: 'authit-csrf', password: 'password-123' }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.csrf_failed' });
  });

  it('rate limits repeated failed logins (429)', async () => {
    const app = makeApp({
      rateLimiter: new InMemoryRateLimiter(60_000, 3),
    });
    await registerAndGetCookie(app, 'authit-ratelimit');
    let last = 200;
    for (let i = 0; i < 5; i += 1) {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
        body: JSON.stringify({ username: 'authit-ratelimit', password: 'wrong-pass' }),
      });
      last = res.status;
      if (last === 429) break;
    }
    expect(last).toBe(429);
  });

  it('audits register / login success / login failure into audit_log', async () => {
    const app = makeApp();
    await registerAndGetCookie(app, 'authit-audit');
    await app.request('/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      body: JSON.stringify({ username: 'authit-audit', password: 'wrong' }),
    });
    await app.request('/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      body: JSON.stringify({ username: 'authit-audit', password: 'password-123' }),
    });
    const rows = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(like(auditLog.action, 'auth.%'));
    const actions = rows.map((r) => r.action);
    expect(actions).toContain('auth.register');
    expect(actions).toContain('auth.login.success');
    expect(actions).toContain('auth.login.failed');
    // 无明文密码泄露：detail 不含真实密码（用户名可含任意串，断言用真实密码值）
    const details = await db.select({ detail: auditLog.detail }).from(auditLog);
    const serialized = JSON.stringify(details);
    expect(serialized).not.toContain('password-123');
    expect(serialized).not.toContain('not-the-password');
  });
});

describe('LDAP channel via HTTP (fake server, real network)', () => {
  let ldapFake: { server: ldap.Server; port: number } | undefined;

  beforeAll(async () => {
    ldapFake = await startLdapServer();
  });

  afterAll(() => {
    ldapFake?.server.close(() => undefined);
  });

  it('provisions a user on first LDAP login and binds identity', async () => {
    const channel = new LdapChannel({
      urls: [`ldap://127.0.0.1:${ldapFake!.port}`],
      bindMode: 'auto',
      userBase: LDAP_BASE,
      userIdAttr: 'sAMAccountName',
      displayNameAttr: 'displayName',
      timeoutMs: 2000,
    });
    const app = makeApp({ ldap: channel });
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      body: JSON.stringify({ username: 'alice', password: 'ldap-pass-1' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string } };
    // 无本地凭据 → LDAP 建号：userId = CN 兜底（fake 不返回属性）
    expect(body.user.id).toBe('alice');

    const binding = await db
      .select({ provider: identityBinding.provider, subject: identityBinding.providerSubject })
      .from(identityBinding)
      .where(eq(identityBinding.userId, 'alice'));
    expect(binding).toHaveLength(1);
    expect(binding[0]?.provider).toBe('ldap');
  });

  it('returns 403 ldap_denied when directory rejects (no local fallback)', async () => {
    const channel = new LdapChannel({
      urls: [`ldap://127.0.0.1:${ldapFake!.port}`],
      bindMode: 'auto',
      userBase: LDAP_BASE,
      userIdAttr: 'sAMAccountName',
      displayNameAttr: 'displayName',
      timeoutMs: 2000,
    });
    const app = makeApp({ ldap: channel });
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      body: JSON.stringify({ username: 'alice', password: 'wrong-directory-password' }),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.ldap_denied' });
  });

  it('local credentials bypass LDAP (escape hatch)', async () => {
    const channel = new LdapChannel({
      urls: [`ldap://127.0.0.1:${ldapFake!.port}`],
      bindMode: 'auto',
      userBase: LDAP_BASE,
      userIdAttr: 'sAMAccountName',
      displayNameAttr: 'displayName',
      timeoutMs: 2000,
    });
    const app = makeApp({ ldap: channel });
    // authit-escape 本地注册（目录无此用户）→ 本地凭据逃生通道成功
    const sid = await registerAndGetCookie(app, 'authit-escape');
    void sid;
    // 用本地密码登录（即使 LDAP enabled 也不会去目录 bind）
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      body: JSON.stringify({ username: 'authit-escape', password: 'password-123' }),
    });
    expect(res.status).toBe(200);
  });
});
