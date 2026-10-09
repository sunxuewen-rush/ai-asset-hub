import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like, or } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { type AppDeps, createApp } from '../../app.js';
import { AUDIT_ACTIONS, createAuditWriter } from '../../audit/audit.js';
import { createClient, type Db } from '../../db/client.js';
import { account, auditLog, user } from '../../db/schema/index.js';
import { createLocalStorage } from '../../storage/local.js';
import { createAuth, hashPassword } from '../better-auth.js';
import type { LdapAuthResult, LdapChannel } from '../ldap.js';
import { DIRECTORY_CREDENTIAL_PREFIX } from '../password-verify.js';
import { InMemoryRateLimiter } from '../rate-limit.js';

/**
 * T3 官方 `sign-in/username` before 钩子（首登建号 · 不短路）测试（M4c-1 plan T3 · 批 design §5.3）。
 *
 * 全链路真库 + 真 HTTP：请求打官方端点，钩子在官方端点**自身中间件之前**执行（真码 `api/dispatch.mjs`）——
 * 本文件同时钉定「不短路」（跨源 Origin 仍被官方中间件拒）与「失败零副作用」两条硬约束。
 *
 * 纪律（AGENTS.md）：只依赖**自己造的数据**（前缀 `t3h`，断言按前缀筛子集）· env `??=` 兜底 ·
 * `afterAll` 按前缀清干净（**审计行先删**——`audit_log.actor_id` 对 `user.id` 有外键）并自证零残留。
 */

/** 本文件自造行前缀（user.id / account.accountId / 邮箱一律由它派生） */
const PREFIX = 't3h';

let db: Db;

/** 目录登录名（= 建号主键 = 工号形态）：全字母数字且 11 字符 —— 满足官方默认用户名校验器（F281） */
const newLogin = (): string => `${PREFIX}${Math.floor(Math.random() * 90_000_000 + 10_000_000)}`;
const emailOf = (id: string): string => `${id}@example.test`;

/** 鸭子型假目录通道（不启真 LDAP）+ 调用留痕 */
function fakeLdap(onAuth: (login: string, password: string) => LdapAuthResult): {
  channel: LdapChannel;
  calls: string[];
} {
  const calls: string[] = [];
  const channel = {
    authenticate: async (login: string, password: string) => {
      calls.push(`${login}|${password}`);
      return onAuth(login, password);
    },
  } as unknown as LdapChannel;
  return { channel, calls };
}

const okResult = (login: string): LdapAuthResult => ({
  status: 'ok',
  identity: { userId: login, displayName: `目录用户 ${login}`, email: `${login}@corp-test.local` },
});

function makeApp(depsOverrides?: Partial<AppDeps>): Hono {
  return createApp({
    db,
    audit: createAuditWriter(db),
    rateLimiter: new InMemoryRateLimiter(60_000, 50),
    ldap: null,
    storage: createLocalStorage('./storage-test'),
    cookieSecure: false,
    ...depsOverrides,
  });
}

const ORIGIN_HEADERS = { origin: 'http://localhost:3000', host: 'localhost:3000' };

/**
 * 强制开启 Origin/CSRF 校验的 app（**测试专用**）：
 * 官方在测试环境默认跳过该校验（源码 `context/create-context.mjs`：`skipOriginCheck = isTest() ? true : false`），
 * 故断言 F283 平价必须显式 `{ disableOriginCheck: false }` —— 与 `apps/server/src/app.test.ts:165` 同款先例。
 */
function makeAppWithOriginCheck(ldap: LdapChannel | null): Hono {
  return createApp({
    db,
    audit: createAuditWriter(db),
    rateLimiter: new InMemoryRateLimiter(60_000, 50),
    storage: createLocalStorage('./storage-test'),
    cookieSecure: false,
    ldap: null,
    auth: createAuth({ ldap, advanced: { disableOriginCheck: false } }),
  });
}

/** 打官方端点（真实全链路：官方解析 → `password.verify` 落到本仓分派） */
async function signIn(app: Hono, username: string, password: string): Promise<Response> {
  return app.request('/api/auth/sign-in/username', {
    method: 'POST',
    headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

/** 直造一条 user + 本地/目录式凭据行（`password` 传 `ldap:<工号>` 即目录式） */
async function insertUserWithCredential(
  id: string,
  username: string,
  password: string | null,
): Promise<void> {
  await db.insert(user).values({
    id,
    name: `夹具 ${username}`,
    email: emailOf(id),
    emailVerified: true,
    status: 'ACTIVE',
    role: 'user',
    username,
    displayUsername: username,
  });
  await db.insert(account).values({
    id: `acc_${randomUUID()}`,
    providerId: 'credential',
    accountId: id,
    userId: id,
    password,
  });
}

/** 本文件前缀下的行数（`user` + `account` + `audit_log` 三处；**只数自己的前缀**） */
async function countPrefixRows(): Promise<number> {
  const users = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.id, `${PREFIX}%`));
  const accounts = await db
    .select({ id: account.id })
    .from(account)
    .where(or(like(account.userId, `${PREFIX}%`), like(account.accountId, `${PREFIX}%`)));
  const audits = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(or(like(auditLog.actorId, `${PREFIX}%`), like(auditLog.targetId, `${PREFIX}%`)));
  return users.length + accounts.length + audits.length;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
});

afterAll(async () => {
  // 顺序 = 外键依赖序：审计行（actorId → user.id，未级联）→ 身份行（级联，但显式删更稳）→ 账号行
  await db
    .delete(auditLog)
    .where(or(like(auditLog.actorId, `${PREFIX}%`), like(auditLog.targetId, `${PREFIX}%`)));
  await db
    .delete(account)
    .where(or(like(account.userId, `${PREFIX}%`), like(account.accountId, `${PREFIX}%`)));
  await db.delete(user).where(like(user.id, `${PREFIX}%`));
  // 自证：本文件按前缀零残留
  expect(await countPrefixRows(), '本文件残留行（user + account + audit_log）').toBe(0);
  await db.$client.end();
});

describe('T3 · 官方 `sign-in/username` before 钩子（首登建号）', () => {
  it('① 首登建号：无用户 + 目录 ok ⇒ 200 官方会话 + user/ldap/credential 三行 + provision 审计', async () => {
    const login = newLogin();
    const { channel, calls } = fakeLdap((l) => okResult(l));
    const app = makeApp({ ldap: channel });

    const resp = await signIn(app, login, 'good-pw');
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { token?: string };
    // 官方端点**常规流程走完**（不是钩子直接返回的响应）——用户名插件登录成功即带 token
    expect(typeof body.token).toBe('string');

    // DB 真值：建号主键 = 目录工号；两行身份：目录行 + 凭据委派行
    const created = (await db.select().from(user).where(eq(user.username, login)))[0];
    expect(created?.id).toBe(login);
    if (!created) throw new Error('首登建号后应存在 user 行');
    const rows = await db.select().from(account).where(eq(account.userId, created.id));
    expect(rows.map((r) => r.providerId).sort()).toEqual(['credential', 'ldap']);
    const delegated = rows.find((r) => r.providerId === 'credential');
    expect(delegated?.accountId).toBe(created.id); // 官方 `findCredentialAccount` 三条件之一
    expect(delegated?.password).toBe(`${DIRECTORY_CREDENTIAL_PREFIX}${login}`);
    expect(rows.find((r) => r.providerId === 'ldap')?.accountId).toBe(login);

    // 首登的既定代价：钩子 bind（建号）1 次 + 官方 `password.verify` 分派 bind 1 次
    expect(calls).toEqual([`${login}|good-pw`, `${login}|good-pw`]);

    // provision 审计（T3 唯一新增审计；沿用既有动作名）
    const audits = await db.select().from(auditLog).where(eq(auditLog.actorId, created.id));
    expect(audits.map((a) => a.action)).toContain(AUDIT_ACTIONS.provisionLdap);
  });

  it('② 已有用户 ⇒ 钩子零介入（目录通道零调用 · 无新行）', async () => {
    const login = newLogin();
    const uid = `${PREFIX}${randomUUID()}`;
    await insertUserWithCredential(uid, login, await hashPassword('local-pw'));

    const { channel, calls } = fakeLdap(() => {
      throw new Error('钩子不该触目录（已有用户）');
    });
    const app = makeApp({ ldap: channel });

    const resp = await signIn(app, login, 'local-pw');
    expect(resp.status).toBe(200);
    expect(calls).toEqual([]); // 钩子未介入；本地凭据行 ⇒ 分派走本仓 scrypt（不触目录）
    expect((await db.select().from(account).where(eq(account.userId, uid))).length).toBe(1);
  });

  it('③ 目录拒 ⇒ **DB 零副作用**（零建号）+ 官方 401（不泄露账号存在性）', async () => {
    const login = newLogin();
    const before = await countPrefixRows();
    const { channel } = fakeLdap(() => ({ status: 'denied' }));
    const app = makeApp({ ldap: channel });

    const resp = await signIn(app, login, 'bad-pw');
    expect(resp.status).toBe(401);
    expect(await countPrefixRows()).toBe(before);
  });

  it('④ 无效登录名（含 `-`）⇒ 钩子不介入：不建号 + 官方 422 `INVALID_USERNAME`（F281 护栏）', async () => {
    const login = `${PREFIX}-bad-name`;
    const before = await countPrefixRows();
    const { channel, calls } = fakeLdap(() => okResult('x'));
    const app = makeApp({ ldap: channel });

    const resp = await signIn(app, login, 'pw');
    expect(resp.status).toBe(422);
    expect(((await resp.json()) as { code?: string }).code).toBe('INVALID_USERNAME');
    expect(calls).toEqual([]); // 护栏先于目录通道 ⇒ 不 bind、不建号（否则会留孤儿账号）
    expect(await countPrefixRows()).toBe(before);
  });

  it('⑤ **不短路硬证**：响应/错误码全为官方语义（我方钩子从不出响应）', async () => {
    // 反证法：造一个「目录 bind 必失败」的场景 ⇒ 若钩子短路，会回我方 `{code,message}`；
    // 实测回的是**官方**错误码 `INVALID_USERNAME_OR_PASSWORD` ⇒ 官方 handler 常规流程走完
    const login = newLogin();
    const uid = `${PREFIX}${randomUUID()}`;
    await insertUserWithCredential(uid, login, await hashPassword('local-pw')); // 既有账号 + 真 scrypt 哈希
    const { channel } = fakeLdap(() => okResult('x'));
    const app = makeApp({ ldap: channel });

    const resp = await signIn(app, login, 'wrong-pw'); // 口令错 ⇒ 只有官方 handler 能给出这个 401
    expect(resp.status).toBe(401);
    const body = (await resp.json()) as { code?: string; message?: string };
    expect(body.code).toBe('INVALID_USERNAME_OR_PASSWORD'); // 官方码（非我方 `auth.*`）
    expect(body.message).not.toMatch(/^auth\./);
  });

  it('⑧ **CSRF / Origin 平价（F283 · 甲）**：跨源 Origin 的登录 POST ⇒ 官方 403 + 零建号', async () => {
    const login = newLogin();
    const before = await countPrefixRows();
    const { channel, calls } = fakeLdap((l) => okResult(l));
    const app = makeAppWithOriginCheck(channel);

    const resp = await app.request('/api/auth/sign-in/username', {
      method: 'POST',
      headers: {
        origin: 'http://evil.test',
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: login, password: 'pw' }),
    });
    expect(resp.status).toBe(403);
    expect(((await resp.json()) as { code?: string }).code).toBe('INVALID_ORIGIN'); // 官方码
    expect(calls).toEqual([]); // CSRF 钩子排在建号钩子**之前** ⇒ 目录零调用
    expect(await countPrefixRows()).toBe(before); // 零建号副作用
  });

  it('⑨ **Fetch Metadata 平价**：`Sec-Fetch-Site: cross-site` + `Mode: navigate` ⇒ 官方 403 `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED` + 零建号', async () => {
    const login = newLogin();
    const before = await countPrefixRows();
    const { channel, calls } = fakeLdap((l) => okResult(l));
    const app = makeAppWithOriginCheck(channel);

    const resp = await app.request('/api/auth/sign-in/username', {
      method: 'POST',
      headers: {
        origin: 'http://evil.test',
        host: 'localhost:3000',
        'content-type': 'application/json',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
      },
      body: JSON.stringify({ username: login, password: 'pw' }),
    });
    expect(resp.status).toBe(403);
    expect(((await resp.json()) as { code?: string }).code).toBe(
      'CROSS_SITE_NAVIGATION_LOGIN_BLOCKED',
    );
    expect(calls).toEqual([]);
    expect(await countPrefixRows()).toBe(before);
  });

  it('⑩ 护栏覆盖面 = 整个登录面：同源 `sign-in/email` 通过、跨源被拒（非仅 `sign-in/username`）', async () => {
    const hostile = (path: string) =>
      app.request(path, {
        method: 'POST',
        headers: {
          origin: 'http://evil.test',
          host: 'localhost:3000',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email: 'nobody@example.test', password: 'pw' }),
      });
    const { channel } = fakeLdap((l) => okResult(l));
    const app = makeAppWithOriginCheck(channel);

    const resp = await hostile('/api/auth/sign-in/email');
    expect(resp.status).toBe(403);
    expect(((await resp.json()) as { code?: string }).code).toBe('INVALID_ORIGIN');
  });

  it('⑥ 存量目录账号**缺凭据委派行** ⇒ 钩子零介入 + 401（补行是迁移 `0015` 的职责，非钩子）', async () => {
    const login = newLogin();
    const uid = `${PREFIX}${randomUUID()}`;
    await db.insert(user).values({
      id: uid,
      name: '存量目录账号',
      email: emailOf(uid),
      emailVerified: true,
      status: 'ACTIVE',
      role: 'user',
      username: login,
      displayUsername: login,
    });
    await db.insert(account).values({
      id: `acc_${randomUUID()}`,
      providerId: 'ldap',
      accountId: login,
      userId: uid,
    });

    const { channel, calls } = fakeLdap(() => okResult(login));
    const app = makeApp({ ldap: channel });

    const resp = await signIn(app, login, 'pw');
    expect(resp.status).toBe(401); // 官方找不到 credential 行 ⇒ 不进 verify
    expect(calls).toEqual([]); // 钩子判「已有用户」⇒ 零介入（不自愈补行）
    expect((await db.select().from(account).where(eq(account.userId, uid))).length).toBe(1);
  });

  it('⑦ 存量目录账号（凭据行 `ldap:<工号>`）二次登录 ⇒ 200 且 bind **恰好 1 次**（钩子不额外 bind）', async () => {
    const login = newLogin();
    const uid = `${PREFIX}${randomUUID()}`;
    await insertUserWithCredential(uid, login, `${DIRECTORY_CREDENTIAL_PREFIX}${login}`);

    const { channel, calls } = fakeLdap((l) => okResult(l));
    const app = makeApp({ ldap: channel });

    const resp = await signIn(app, login, 'dir-pw');
    expect(resp.status).toBe(200);
    expect(calls).toEqual([`${login}|dir-pw`]); // 只有分派那一次（钩子零介入）
  });
});
