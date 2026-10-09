import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { like, or } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Hono } from 'hono';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { type AppDeps, createApp } from '../app.js';
import { createAuditWriter } from '../audit/audit.js';
import { createClient, type Db } from '../db/client.js';
import { account, auditLog, user } from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import { createTestUser, TEST_PASSWORD } from '../test-utils/auth-fixture.js';
import type { LdapAuthResult, LdapChannel } from './ldap.js';
import {
  DIRECTORY_CREDENTIAL_PREFIX,
  DUMMY_PASSWORD_HASH,
  verifyCredential,
} from './password-verify.js';

/**
 * T2 存值前缀分派测试（M4c-1 plan T2 · 批 design §5.2 / 主 design §3.2）。
 *
 * 两层：
 * - **纯函数层**：`verifyCredential` 直测（注入 spy 的 scrypt 校验 + 鸭子型假目录通道）；
 * - **端到端层**：真库 + 官方 `sign-in/username`（真 HTTP 全链路）——
 *   目录账号走目录 bind；**本地账号走本仓 scrypt（F279 存量零回归守卫）**；异常一律 401 而非 500。
 *
 * 纪律（AGENTS.md）：只依赖自己造的数据（前缀 `pwv-` / `pwv-sub-`，断言按前缀筛子集）· env `??=` 兜底 ·
 * `afterAll` 自清并自证零残留。
 */

const PREFIX = 'pwv';
let db: Db;

const newId = (): string => `${PREFIX}${randomUUID()}`;
/** 造一个「工号」形态的目录登录名（8 位数字前缀 + 短随机，便于断言且不撞既有数据） */
const newEmployeeId = (): string =>
  `9${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`.slice(0, 8);
const emailOf = (id: string): string => `${id}@example.test`;
/**
 * 短 id 且**全字母数字**：官方 `sign-in/username` 有 ① 长度上限（默认 3–30）② 默认用户名校验器
 * `/^[a-zA-Z0-9_.]+$/`（**收字母/数字/`_`/`.`，不收 `-`**；实测 422 `INVALID_USERNAME`，
 * `dist/plugins/username/index.mjs`）③ 凭据行须 `account_id = user.id` 才被官方 `findCredentialAccount`
 * 命中 —— 本文件自建行，故 id 直接取合法用户名形态（夹具侧由 `loginNameOf` 统一归一）。
 */
const shortId = (): string =>
  `${PREFIX}${randomUUID().replace(/\D/g, '').slice(0, 8)}${randomUUID().slice(0, 4)}`;

/** 鸭子型假目录通道（不启真 LDAP；真网络路径由 `app.test.ts` 的 ldapjs 用例覆盖） */
function fakeLdap(onAuth: (login: string, password: string) => LdapAuthResult): LdapChannel {
  return {
    authenticate: async (login: string, password: string) => onAuth(login, password),
  } as unknown as LdapChannel;
}

const okResult = (login: string): LdapAuthResult => ({
  status: 'ok',
  identity: { userId: login, displayName: `目录用户 ${login}`, email: `${login}@corp-test.local` },
});
const denied: LdapAuthResult = { status: 'denied' };

function makeApp(depsOverrides?: Partial<AppDeps>): Hono {
  return createApp({
    db,
    audit: createAuditWriter(db),
    ldap: null,
    storage: createLocalStorage('./storage-test'),
    cookieSecure: false,
    ...depsOverrides,
  });
}

const ORIGIN_HEADERS = { origin: 'http://localhost:3000', host: 'localhost:3000' };

async function signIn(app: Hono, username: string, password: string): Promise<Response> {
  return app.request('/api/auth/sign-in/username', {
    method: 'POST',
    headers: { ...ORIGIN_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

/** 造「目录账号」：`user` + 凭据委派行（`accountId = user.id` · `password = 'ldap:<工号>'`，迁移 0015 语义） */
async function createDirectoryUser(employeeId: string, status = 'ACTIVE'): Promise<string> {
  const id = newId();
  await db.insert(user).values({
    id,
    name: `目录用户 ${employeeId}`,
    email: emailOf(id),
    emailVerified: true,
    status,
    role: 'user',
    username: employeeId,
    displayUsername: employeeId,
  });
  await db.insert(account).values({
    id: `acc_${randomUUID()}`,
    providerId: 'credential',
    accountId: id,
    userId: id,
    password: `${DIRECTORY_CREDENTIAL_PREFIX}${employeeId}`,
  });
  return id;
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
});

afterAll(async () => {
  // `audit_log.actor_id` → user（NO ACTION）⇒ **先摘审计行**（T6 起官方 `sign-in/username` 的
  // 登录审计由插件 after 钩子写入 —— F282 收口；本文件 ⑨⑩⑪ 走官方端点 ⇒ 会产生 `auth.login.*` 行）
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  await db
    .delete(account)
    .where(or(like(account.userId, `${PREFIX}%`), like(account.accountId, `${PREFIX}%`)));
  await db.delete(user).where(like(user.id, `${PREFIX}%`));
  // 自证：本文件按前缀零残留（user + account 双查；**只清自己的前缀**，不碰其它测试的夹具账号）
  const leftUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.id, `${PREFIX}%`));
  const leftAccounts = await db
    .select({ id: account.id })
    .from(account)
    .where(or(like(account.userId, `${PREFIX}%`), like(account.accountId, `${PREFIX}%`)));
  const leftAudit = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(like(auditLog.actorId, `${PREFIX}%`));
  expect(leftUsers.length, '本文件残留 user 行').toBe(0);
  expect(leftAccounts.length, '本文件残留 account 行').toBe(0);
  expect(leftAudit.length, '本文件残留 audit 行').toBe(0);
  await db.$client.end();
});

describe('T2 · verifyCredential 前缀分派（纯函数层）', () => {
  it('① 非 `ldap:` 存值 ⇒ 走注入的本仓 scrypt（不触目录）', async () => {
    const seen: Array<[string, string]> = [];
    const spy = async (password: string, stored: string) => {
      seen.push([password, stored]);
      return stored === 'HASH-LOCAL';
    };
    const ldapTouched = { hit: false };
    const ldap = fakeLdap(() => {
      ldapTouched.hit = true;
      return okResult('x');
    });
    expect(await verifyCredential('HASH-LOCAL', 'pw', ldap, spy)).toBe(true);
    expect(seen).toEqual([['pw', 'HASH-LOCAL']]);
    expect(ldapTouched.hit).toBe(false);
  });

  it('② `ldap:<工号>` + 目录 ok ⇒ true（登录名正确传入 bind 且跑等价耗时）', async () => {
    const calls: string[] = [];
    const ldap = fakeLdap((login, password) => {
      calls.push(`${login}|${password}`);
      return okResult(login);
    });
    const dummyUsed: string[] = [];
    const spy = async (_password: string, stored: string) => {
      dummyUsed.push(stored);
      return false;
    };
    expect(await verifyCredential('ldap:59901934', 'ldap-pw', ldap, spy)).toBe(true);
    expect(calls).toEqual(['59901934|ldap-pw']);
    expect(dummyUsed).toEqual([DUMMY_PASSWORD_HASH]); // 等价耗时恰一次
  });

  it('③ `ldap:<工号>` + 目录拒 ⇒ false', async () => {
    const ldap = fakeLdap(() => denied);
    expect(await verifyCredential('ldap:59901934', 'bad', ldap, async () => false)).toBe(false);
  });

  it('④ 目录未启用（ldap=null）⇒ false，且**仍花等价耗时**（不泄露账号存在性）', async () => {
    const dummyUsed: string[] = [];
    const spy = async (_p: string, stored: string) => {
      dummyUsed.push(stored);
      return false;
    };
    expect(await verifyCredential('ldap:59901934', 'pw', null, spy)).toBe(false);
    expect(dummyUsed).toEqual([DUMMY_PASSWORD_HASH]);
  });

  it('⑤ 标记行无登录名（`ldap:`）⇒ false + 等价耗时', async () => {
    const dummyUsed: string[] = [];
    const spy = async (_p: string, stored: string) => {
      dummyUsed.push(stored);
      return false;
    };
    expect(
      await verifyCredential(
        'ldap:',
        'pw',
        fakeLdap(() => okResult('x')),
        spy,
      ),
    ).toBe(false);
    expect(dummyUsed).toEqual([DUMMY_PASSWORD_HASH]);
  });

  it('⑥ 异格式存值（官方 `salt:key` 形态）⇒ 交给注入的 scrypt 判 false（**不抛** —— F279 反证）', async () => {
    const officialShaped = 'aaaa:bbbb';
    const r = await verifyCredential(officialShaped, 'pw', null, async () => false);
    expect(r).toBe(false);
  });
});

describe('T2 · 官方 sign-in/username 端到端（真库 · 真 HTTP）', () => {
  it('⑦ 目录账号（凭据委派行 `ldap:<工号>`）⇒ 目录 bind 通过 ⇒ 200 + 官方会话 cookie', async () => {
    const employeeId = newEmployeeId();
    await createDirectoryUser(employeeId);
    const res = await signIn(
      makeApp({ ldap: fakeLdap((login) => (login === employeeId ? okResult(login) : denied)) }),
      employeeId,
      'ldap-pw',
    );
    expect(res.status).toBe(200);
    const cookie = res.headers
      .getSetCookie()
      .find((v) => v.startsWith('better-auth.session_token='));
    expect(cookie, '官方会话 cookie').toBeDefined();
  });

  it('⑧ 目录账号 + 目录拒 ⇒ 401（**不是** 500）', async () => {
    const employeeId = newEmployeeId();
    await createDirectoryUser(employeeId);
    const res = await signIn(makeApp({ ldap: fakeLdap(() => denied) }), employeeId, 'wrong');
    expect(res.status).toBe(401);
  });

  it('⑨ **本地账号（真实 `$scrypt$` 哈希）⇒ 200** —— F279 存量零回归守卫', async () => {
    const id = await createTestUser(db, { id: shortId(), displayName: '本地账号' });
    const res = await signIn(makeApp({ ldap: null }), id, TEST_PASSWORD);
    expect(res.status).toBe(200);
  });

  it('⑩ 本地账号 + 错口令 ⇒ 401（不 500）', async () => {
    const id = await createTestUser(db, { id: shortId(), displayName: '本地账号2' });
    const res = await signIn(makeApp({ ldap: null }), id, 'not-the-password');
    expect(res.status).toBe(401);
  });

  it('⑪ 存值异格式（官方 `salt:key`）⇒ 401（不 500；证明分支不会误走官方算法）', async () => {
    const id = newId();
    const username = `pwvx${randomUUID().slice(0, 8)}`;
    await db.insert(user).values({
      id,
      name: '异格式账号',
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
      password: 'deadbeef:cafe', // 官方 crypto 形态：本仓 scrypt 判 false（过去会走官方 ⇒ 抛错 ⇒ 500）
    });
    const res = await signIn(makeApp({ ldap: null }), username, 'whatever');
    expect(res.status).toBe(401);
  });
});
