import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, gte, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Hono } from 'hono';
import ldap from 'ldapjs';

// 集成测试：真实 PG + 真实 HTTP 全链路（app.request）
process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { type AppDeps, createApp } from './app.js';
import { createAuditWriter } from './audit/audit.js';
import { type AihAuth, createAuth } from './auth/better-auth.js';
import { LdapChannel } from './auth/ldap.js';
import { InMemoryRateLimiter } from './auth/rate-limit.js';
import { createClient, type Db } from './db/client.js';
import { account, auditLog, user } from './db/schema/index.js';
import { createLocalStorage } from './storage/local.js';
import { cleanupCreatedUsers, createTestUser, TEST_PASSWORD } from './test-utils/auth-fixture.js';

/**
 * 认证全链路集成测试（M4b-pre T3 · design §8 契约表）：
 * - 自助注册 = 官方 `POST /api/auth/sign-up/email`（响应体按官方契约；前端属 M4b-2 未动工）
 * - 登录 = 自绘 `POST /api/auth/sign-in/aih`（三路分派；`{code}` 结构化错误沿用 07 §4）
 * - 登出 = 官方 `POST /api/auth/sign-out`；会话读取 = `GET /api/auth/me`（形状不变）
 * - Origin 校验 = 官方（`INVALID_ORIGIN` 等官方错误码）
 * - 会话落库：**换一个 app 实例（= 进程重启等价）同一 cookie 仍 200**（缺陷修复实证，断言⑪）
 */

let db: Db;
let auth: AihAuth;
const PREFIX = 'authit-';

function makeApp(depsOverrides?: Partial<AppDeps>): Hono {
  return createApp({
    db,
    // 不传 `auth`：由 createApp 按本 deps 构造实例（LDAP 通道随 `ldap` 注入进入插件）
    audit: createAuditWriter(db),
    rateLimiter: new InMemoryRateLimiter(60_000, 5),
    ldap: null,
    storage: createLocalStorage('./storage-test'),
    cookieSecure: false,
    ...depsOverrides,
  });
}

/** 取响应里的官方会话 cookie（`better-auth.session_token=…`） */
function sessionCookieOf(res: Response): string {
  const entry = res.headers
    .getSetCookie()
    .find((value) => value.startsWith('better-auth.session_token='));
  expect(entry, 'official session cookie present').toBeDefined();
  return entry!.split(';')[0]!;
}

const ORIGIN_HEADERS = { origin: 'http://localhost:3000', host: 'localhost:3000' };

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  auth = createAuth({ ldap: null });
});

afterAll(async () => {
  // 夹具登记制清理（含官方 `apikey`/`session` 随用户登记下线；本文件有签发令牌的用例——
  // 少了它 user 删除会被 `api_token_user_id_user_id_fk` 拦下，残留行会让下次运行撞 `user_pkey`）
  await cleanupCreatedUsers(db);
  // 前缀清理（禁全表 delete——纪律）；顺序满足 FK：audit_log → user（session/account 级联）
  await db.delete(auditLog).where(like(auditLog.targetId, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  await db.delete(auditLog).where(eq(auditLog.actorId, 'alice'));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  await db.delete(user).where(like(user.id, `${PREFIX}%`));
  await db.delete(auditLog).where(eq(auditLog.actorId, 'alice'));
  await db.delete(user).where(eq(user.id, 'alice'));
  await db.$client.end();
});

describe('auth full flow (official endpoints + directory plugin, real PG)', () => {
  it('healthz returns ok', async () => {
    const res = await makeApp().request('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('自助注册 → me → sign-out → me 401（官方端点 + 官方 cookie）', async () => {
    const app = makeApp();
    const email = `${PREFIX}signup-${randomUUID()}@test.local`;
    const res = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: TEST_PASSWORD, name: `${PREFIX}signup` }),
    });
    expect(res.status).toBe(200);
    const cookie = sessionCookieOf(res);

    const me = await app.request('/api/auth/me', { headers: { cookie } });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as { user: { id: string; displayName: string }; role: number };
    expect(meBody.user.displayName).toBe(`${PREFIX}signup`);
    expect(meBody.role).toBe(1); // 默认档（user）

    const logout = await app.request('/api/auth/sign-out', { method: 'POST', headers: { cookie } });
    expect(logout.status).toBe(200);

    const meAfter = await app.request('/api/auth/me', { headers: { cookie } });
    expect(meAfter.status).toBe(401);
    expect(await meAfter.json()).toMatchObject({ code: 'auth.session_expired' });
  });

  it('登录（自绘端点）：正确口令放行 + 大写登录名归一', async () => {
    const app = makeApp();
    const id = await createTestUser(db, { id: `${PREFIX}login`, displayName: `${PREFIX}login` });
    const res = await app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ username: id.toUpperCase(), password: TEST_PASSWORD }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { id: string; displayName: string };
      session: unknown;
    };
    expect(body.user.id).toBe(id);
    expect(sessionCookieOf(res)).toContain('better-auth.session_token=');
  });

  it('登录：错误口令 → 401 auth.invalid_credentials', async () => {
    const app = makeApp();
    const id = await createTestUser(db, { id: `${PREFIX}wrong`, displayName: `${PREFIX}wrong` });
    const res = await app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ username: id, password: 'not-the-password' }),
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'auth.invalid_credentials' });
  });

  it('会话落库：换进程（新 app 实例）后同一 cookie 仍可用', async () => {
    const first = makeApp();
    const id = await createTestUser(db, {
      id: `${PREFIX}persist`,
      displayName: `${PREFIX}persist`,
    });
    const signIn = await first.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ username: id, password: TEST_PASSWORD }),
    });
    const cookie = sessionCookieOf(signIn);

    // 新 app 实例 = 新官方实例（内存态清零；会话只在 DB ⇒ 重启不死）
    const restarted = makeApp({ auth: createAuth({ ldap: null }) });
    const me = await restarted.request('/api/auth/me', { headers: { cookie } });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { user: { id: string } }).user.id).toBe(id);
  });

  it('origin 校验交官方：跨源/无 Origin 写请求 403（官方错误码）', async () => {
    // 官方在 `NODE_ENV=test` 下**默认跳过** Origin 校验（源码 create-context.mjs:211）⇒
    // 断言三态须显式打开；生产/开发环境默认即开启。
    const app = makeApp({
      auth: createAuth({ ldap: null, advanced: { disableOriginCheck: false } }),
    });
    const crossOrigin = await app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: {
        origin: 'http://evil.test',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: `${PREFIX}nobody`, password: TEST_PASSWORD }),
    });
    expect(crossOrigin.status).toBe(403);
    expect(await crossOrigin.json()).toMatchObject({ code: 'INVALID_ORIGIN' });

    // 白名单命中（同源）→ 放行进入业务逻辑（此处账号不存在 ⇒ 401 invalid_credentials）
    const sameOrigin = await app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: `${PREFIX}nobody`, password: TEST_PASSWORD }),
    });
    expect(sameOrigin.status).toBe(401);
    expect(await sameOrigin.json()).toMatchObject({ code: 'auth.invalid_credentials' });

    // 第三态（**dev 侧 A1 阻塞的同款机制**）：带会话 cookie 但无 Origin/Referer 的写请求 → 403
    const id = await createTestUser(db, {
      id: `${PREFIX}origin`,
      displayName: `${PREFIX}origin`,
    });
    const signIn = await app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: id, password: TEST_PASSWORD }),
    });
    const cookie = sessionCookieOf(signIn);
    const noOrigin = await app.request('/api/auth/sign-out', {
      method: 'POST',
      headers: { cookie, host: 'localhost:3000' },
    });
    expect(noOrigin.status).toBe(403);
    expect(await noOrigin.json()).toMatchObject({ code: 'MISSING_OR_NULL_ORIGIN' });
  });

  it('业务面同源守卫：cookie 写请求跨源/缺 Origin → 403；无 cookie 与 Bearer 通道豁免', async () => {
    // 守卫恒开（不随官方 `NODE_ENV=test` 跳过 Origin 校验的隐藏行为走）——设计意图：业务面防线不因环境弱化
    const app = makeApp();
    const id = await createTestUser(db, {
      id: `${PREFIX}guarded`,
      displayName: `${PREFIX}guarded`,
    });
    const signIn = await app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ username: id, password: TEST_PASSWORD }),
    });
    const cookie = sessionCookieOf(signIn);

    // ① 跨源（cookie 通道）→ 403 `auth.csrf_failed`（沿用删除前 `csrf.ts` 的错误码：前端映射零新增）
    const crossOrigin = await app.request('/api/tokens', {
      method: 'POST',
      headers: {
        cookie,
        origin: 'http://evil.test',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    expect(crossOrigin.status).toBe(403);
    expect(await crossOrigin.json()).toMatchObject({ code: 'auth.csrf_failed' });

    // ② 带 cookie 但无 Origin/Referer → 403（官方平面第三态同款机制，业务面同口径）
    const noOrigin = await app.request('/api/tokens', {
      method: 'POST',
      headers: { cookie, host: 'localhost:3000', 'content-type': 'application/json' },
      body: '{}',
    });
    expect(noOrigin.status).toBe(403);
    expect(await noOrigin.json()).toMatchObject({ code: 'auth.csrf_failed' });

    // ③ 同源（官方 baseURL 自动入白名单，``AUTH_TRUSTED_ORIGINS`` 空亦可）→ 放行进业务：201 签发
    // （M4b-3：名称必填 ⇒ body 带 name）
    const sameOrigin = await app.request('/api/tokens', {
      method: 'POST',
      headers: { cookie, ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'origin-guard' }),
    });
    expect(sameOrigin.status).toBe(201);

    // ④ 无 cookie（CLI / 匿名通道）→ 守卫不介入（官方同构的 cookie 门），由路由层判 401
    const noCookie = await app.request('/api/tokens', {
      method: 'POST',
      headers: {
        origin: 'http://evil.test',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    expect(noCookie.status).toBe(401);
    expect(await noCookie.json()).toMatchObject({ code: 'auth.session_expired' });

    // ⑤ Bearer 显式通道跳过守卫（含无效 Bearer 不降级回 cookie）→ 跨源 + 无效 Bearer 仍是 401
    const invalidBearer = await app.request('/api/tokens', {
      method: 'POST',
      headers: {
        cookie,
        authorization: 'Bearer not-a-real-token',
        origin: 'http://evil.test',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    expect(invalidBearer.status).toBe(401);
    expect(await invalidBearer.json()).toMatchObject({ code: 'auth.session_expired' });

    // ⑥ Origin 缺失 → **Referer 回退**（T8 收口 T3 登记缺口：逻辑在、专用用例缺）
    const refererTrusted = await app.request('/api/tokens', {
      method: 'POST',
      headers: {
        cookie,
        referer: 'http://localhost:3000/dashboard',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'referer-trusted' }), // M4b-3：名称必填
    });
    expect(refererTrusted.status).toBe(201); // 受信任 Referer → 放行进业务

    const refererCross = await app.request('/api/tokens', {
      method: 'POST',
      headers: {
        cookie,
        referer: 'http://evil.test/dashboard',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    expect(refererCross.status).toBe(403);
    expect(await refererCross.json()).toMatchObject({ code: 'auth.csrf_failed' });

    // ⑦ `Origin: null` + `Sec-Fetch-Site: same-origin` → 以请求自身 origin 参与校验（官方同款回退）
    const nullOriginSameSite = await app.request('/api/tokens', {
      method: 'POST',
      headers: {
        cookie,
        origin: 'null',
        'sec-fetch-site': 'same-origin',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'null-origin-samesite' }), // M4b-3：名称必填
    });
    expect(nullOriginSameSite.status).toBe(201);

    // ⑦-b 同上但跨站标记 → 403（回退不放过真跨站）
    const nullOriginCrossSite = await app.request('/api/tokens', {
      method: 'POST',
      headers: {
        cookie,
        origin: 'null',
        'sec-fetch-site': 'cross-site',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: '{}',
    });
    expect(nullOriginCrossSite.status).toBe(403);
  });

  it('rate limits repeated failed logins (429)', async () => {
    const app = makeApp({ rateLimiter: new InMemoryRateLimiter(60_000, 3) });
    const id = await createTestUser(db, {
      id: `${PREFIX}ratelimit`,
      displayName: `${PREFIX}ratelimit`,
    });
    let last = 200;
    for (let i = 0; i < 6; i += 1) {
      const res = await app.request('/api/auth/sign-in/aih', {
        method: 'POST',
        headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
        body: JSON.stringify({ username: id, password: 'wrong-pass' }),
      });
      last = res.status;
      if (last === 429) break;
    }
    expect(last).toBe(429);
  });

  it('审计：注册 / 登出 / 登录成败入 audit_log，且不含明文口令', async () => {
    const since = new Date(Date.now() - 1000);
    const app = makeApp();
    const signup = await app.request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `${PREFIX}audit-${randomUUID()}@test.local`,
        password: TEST_PASSWORD,
        name: `${PREFIX}audit`,
      }),
    });
    const cookie = sessionCookieOf(signup);
    await app.request('/api/auth/sign-out', { method: 'POST', headers: { cookie } });

    const id = await createTestUser(db, { id: `${PREFIX}audit2`, displayName: `${PREFIX}audit2` });
    await app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ username: id, password: 'wrong' }),
    });
    await app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ username: id, password: TEST_PASSWORD }),
    });

    // 只取本用例时间窗内产生的行（并发文件也会写 audit_log——AGENTS.md「只依赖自己造的数据」）
    const actions = (
      await db
        .select({ action: auditLog.action })
        .from(auditLog)
        .where(gte(auditLog.createdAt, since))
    ).map((row) => row.action);
    expect(actions).toContain('auth.register');
    expect(actions).toContain('auth.logout');
    expect(actions).toContain('auth.login.success');
    expect(actions).toContain('auth.login.failed');

    const details = await db
      .select({ detail: auditLog.detail })
      .from(auditLog)
      .where(gte(auditLog.createdAt, since));
    const serialized = JSON.stringify(details);
    expect(serialized).not.toContain(TEST_PASSWORD);
    expect(serialized).not.toContain('not-the-password');
    // 注：不可断言 `not.toContain('wrong')`——用例里的用户名含 `authit-wrong`；口令明文面由上面两条覆盖
  });
});

describe('LDAP channel via HTTP (fake server, real network)', () => {
  const LDAP_BASE = 'ou=people,dc=example,dc=com';
  interface FakeUser {
    sam: string;
    password: string;
    displayName: string;
    email?: string;
  }
  // carol 无 mail ⇒ 覆盖「目录邮箱缺失即拒」（design R15）
  const FAKE_USERS: FakeUser[] = [
    {
      sam: 'alice',
      password: 'ldap-pass-1',
      displayName: 'Alice Wu',
      email: 'Alice.Wu@corp-test.local',
    },
    {
      sam: 'bob',
      password: 'ldap-pass-2',
      displayName: 'Bob Li',
      email: 'bob.collide@corp-test.local',
    },
    { sam: 'carol', password: 'ldap-pass-3', displayName: 'Carol Chen' },
  ];
  let ldapFake: { server: ldap.Server; port: number } | undefined;

  function resolve(dn: string): FakeUser | undefined {
    const lower = dn.toLowerCase();
    return FAKE_USERS.find(
      (u) => lower === u.sam.toLowerCase() || lower.includes(`cn=${u.sam.toLowerCase()}`),
    );
  }

  function startLdapServer(): Promise<{ server: ldap.Server; port: number }> {
    return new Promise((resolveListen) => {
      const server = ldap.createServer();
      server.bind(LDAP_BASE, (req: any, res: any) => {
        const entry = resolve(req.dn.toString());
        if (!entry || req.credentials !== entry.password) {
          res.send(49);
          return;
        }
        res.end();
      });
      // base scope 读自身属性（含 `mail`——目录邮箱是建号必填项）
      server.search(LDAP_BASE, (req: any, res: any) => {
        const entry = resolve(req.dn.toString());
        if (!entry) {
          res.end();
          return;
        }
        res.send({
          dn: req.dn.toString(),
          attributes: {
            sAMAccountName: entry.sam,
            displayName: entry.displayName,
            ...(entry.email ? { mail: entry.email } : {}),
          },
        });
        res.end();
      });
      server.listen(0, '127.0.0.1', () => {
        const address = (server as unknown as { address: () => { port: number } }).address();
        resolveListen({ server, port: address.port });
      });
    });
  }

  function channel(): LdapChannel {
    return new LdapChannel({
      urls: [`ldap://127.0.0.1:${ldapFake!.port}`],
      bindMode: 'auto',
      userBase: LDAP_BASE,
      userIdAttr: 'sAMAccountName',
      displayNameAttr: 'displayName',
      timeoutMs: 2000,
    });
  }

  const signIn = (app: Hono, username: string, password: string) =>
    app.request('/api/auth/sign-in/aih', {
      method: 'POST',
      headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

  beforeAll(async () => {
    ldapFake = await startLdapServer();
  });

  afterAll(() => {
    ldapFake?.server.close(() => undefined);
  });

  it('目录首登建号：user（工号主键 + 目录邮箱/显示名）+ account(provider_id=ldap)', async () => {
    const app = makeApp({ ldap: channel() });
    const res = await signIn(app, 'alice', 'ldap-pass-1');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; displayName: string } };
    expect(body.user.id).toBe('alice'); // userIdAttr 映射值（D3 语义保留）
    // ldapjs v3 fake server 的 `displayName` 属性**未回传**（仓内既有记录：属性序列化不稳定）⇒
    // 走 CN 兜底；属性增强路径（displayName/mail 真值）由真实 DC 覆盖（T26 人工项）。
    expect(body.user.displayName).toBe('CN=alice,ou=people,dc=example,dc=com');

    const [row] = await db
      .select({
        email: user.email,
        role: user.role,
        status: user.status,
        username: user.username,
      })
      .from(user)
      .where(eq(user.id, 'alice'));
    expect(row?.email).toBe('alice.wu@corp-test.local'); // 官方写入路径小写化（X1）
    expect(row?.role).toBe('user'); // 默认档
    expect(row?.status).toBe('ACTIVE');
    expect(row?.username).toBe('alice');

    const accounts = await db
      .select({ providerId: account.providerId, accountId: account.accountId })
      .from(account)
      .where(eq(account.userId, 'alice'));
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual({ providerId: 'ldap', accountId: 'alice' });
  });

  it('目录拒绝（错口令）→ 403 ldap_denied，不回退本地', async () => {
    const app = makeApp({ ldap: channel() });
    const res = await signIn(app, 'alice', 'wrong-directory-password');
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.ldap_denied' });
  });

  it('目录邮箱缺失 → 400 auth.email_missing（绝不合成）', async () => {
    const app = makeApp({ ldap: channel() });
    const res = await signIn(app, 'carol', 'ldap-pass-3');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'auth.email_missing' });
  });

  it('目录邮箱与既有账号冲突 → 409 auth.email_conflict', async () => {
    const app = makeApp({ ldap: channel() });
    // 占位：同邮箱的既有账号（非目录身份）
    await createTestUser(db, {
      id: `${PREFIX}collide`,
      displayName: `${PREFIX}collide`,
      username: `${PREFIX}collide`,
    });
    await db
      .update(user)
      .set({ email: 'bob.collide@corp-test.local' })
      .where(eq(user.id, `${PREFIX}collide`));
    const res = await signIn(app, 'bob', 'ldap-pass-2');
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'auth.email_conflict' });
  });

  it('本地凭据优先（逃生通道）：目录在场也不去 bind', async () => {
    const app = makeApp({ ldap: channel() });
    const id = await createTestUser(db, {
      id: `${PREFIX}escape`,
      displayName: `${PREFIX}escape`,
      username: `${PREFIX}escape`,
    });
    const res = await signIn(app, id, TEST_PASSWORD);
    expect(res.status).toBe(200);
  });
});
