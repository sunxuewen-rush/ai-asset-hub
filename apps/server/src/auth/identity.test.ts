import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, like, or } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createClient, type Db } from '../db/client.js';
import { account, user } from '../db/schema/index.js';
import { createIdentityRules, type IdentityRules } from './identity.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

/**
 * 身份源共享模块测试（M4c-1 plan T1 · 批 design §5.4）——**模块层直测**（端点层的网在 `app.test.ts`）。
 *
 * 钉定 §5.4 五条职责的可执行语义：身份复用与漂移同步 · 邮箱归一与必填 · 显示名与默认档 ·
 * 账号链接策略落点（本批 = 撞邮箱即拒，M4c-3 接线自动链接）· 状态门。
 *
 * 纪律（AGENTS.md）：只依赖**自己造的数据**（全部断言按本文件前缀筛子集，dev 库存在 564 个 user 也不受影响）·
 * env 用 `??=` 兜底（注入值优先，不无条件改写）· 用完按前缀清干净并在 `afterAll` 自证零残留。
 */

/** 本文件自造行前缀（user.id / account.accountId / 邮箱一律由它派生） */
const PREFIX = 'it-idrule-';
const SUBJECT_PREFIX = 'it-sub-';

let db: Db;
let rules: IdentityRules;

const newId = (): string => `${PREFIX}${randomUUID()}`;
const newSubject = (): string => `${SUBJECT_PREFIX}${randomUUID()}`;
const emailOf = (id: string): string => `${id}@example.test`;

/** 按 id 前缀数（本文件专属子集；绝不数全表） */
async function countUsers(id: string): Promise<number> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, id));
  return rows.length;
}

/** 取库中行（断言读 DB 真值，不读返回值） */
async function readUser(id: string) {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      role: user.role,
      username: user.username,
      displayUsername: user.displayUsername,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return rows[0] ?? null;
}

async function readAccount(providerId: string, accountId: string) {
  const rows = await db
    .select({
      id: account.id,
      providerId: account.providerId,
      accountId: account.accountId,
      userId: account.userId,
    })
    .from(account)
    .where(and(eq(account.providerId, providerId), eq(account.accountId, accountId)))
    .limit(1);
  return rows[0] ?? null;
}

/** 直写一条无身份映射的 user 行（仅「竞态回查」用例需要：模拟并发下已被他路建出的账号） */
async function insertBareUser(id: string, email: string): Promise<void> {
  await db.insert(user).values({
    id,
    name: 'bare',
    email,
    emailVerified: true,
    status: 'ACTIVE',
    role: 'user',
    username: id,
    displayUsername: id,
  });
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rules = createIdentityRules({ db });
});

afterAll(async () => {
  // 先删身份行再删账号行（避免 FK 顺序问题），随后**自证零残留**
  await db
    .delete(account)
    .where(or(like(account.userId, `${PREFIX}%`), like(account.accountId, `${SUBJECT_PREFIX}%`)));
  await db.delete(user).where(like(user.id, `${PREFIX}%`));
  const leftUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.id, `${PREFIX}%`));
  const leftAccounts = await db
    .select({ id: account.id })
    .from(account)
    .where(or(like(account.userId, `${PREFIX}%`), like(account.accountId, `${SUBJECT_PREFIX}%`)));
  expect(leftUsers.length, '本文件残留 user 行').toBe(0);
  expect(leftAccounts.length, '本文件残留 account 行').toBe(0);
  await db.$client.end();
});

describe('identity rules §5.4 · 建号/复用', () => {
  it('① 命中复用：同 (provider, subject) 二次调用 ⇒ created=false · 同账号 · 行数不变', async () => {
    const id = newId();
    const subject = newSubject();
    const first = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject,
      displayName: '张三',
      email: emailOf(id),
      userId: id,
    });
    if (!first.ok) throw new Error(`首次建号应成功，实得 ${first.code}`);
    expect(first.created).toBe(true);

    // 第二次故意传**不同** userId —— 走复用分支的唯一解释是命中 (provider, subject)
    const second = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject,
      displayName: '张三',
      email: emailOf(newId()),
      userId: newId(),
    });
    if (!second.ok) throw new Error(`复用应成功，实得 ${second.code}`);
    expect(second.created).toBe(false);
    expect(second.account.id).toBe(id);
    expect(await countUsers(id)).toBe(1);
  });

  it('② 显示名漂移同步：再次登录带新显示名 ⇒ user.name 被更新（断 DB 真值）', async () => {
    const id = newId();
    const subject = newSubject();
    const first = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject,
      displayName: '旧名',
      email: emailOf(id),
      userId: id,
    });
    if (!first.ok) throw new Error(`建号应成功，实得 ${first.code}`);

    const again = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject,
      displayName: '新名',
      email: emailOf(id),
      userId: id,
    });
    if (!again.ok) throw new Error(`复用应成功，实得 ${again.code}`);
    const row = await readUser(id);
    expect(row?.name).toBe('新名');
  });

  it('③ 邮箱必填：email=null ⇒ auth.email_missing 且**零写入**', async () => {
    const id = newId();
    const res = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject: newSubject(),
      displayName: '无邮箱',
      email: null,
      userId: id,
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('不应成功');
    expect(res.code).toBe('auth.email_missing');
    expect(await countUsers(id)).toBe(0);
  });

  it('④ 邮箱归一：大小写 + 空白 ⇒ 入库为小写去空白（断 DB 真值）', async () => {
    const id = newId();
    const res = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject: newSubject(),
      displayName: '归一',
      email: `  ${id.toUpperCase()}@EXAMPLE.Test  `,
      userId: id,
    });
    if (!res.ok) throw new Error(`建号应成功，实得 ${res.code}`);
    const row = await readUser(id);
    expect(row?.email).toBe(`${id}@example.test`);
  });

  it('⑤ 邮箱冲突：同邮箱已有他帐 ⇒ auth.email_conflict 且零写入', async () => {
    const idA = newId();
    const first = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject: newSubject(),
      displayName: 'A',
      email: emailOf(idA),
      userId: idA,
    });
    if (!first.ok) throw new Error(`A 建号应成功，实得 ${first.code}`);

    const idB = newId();
    const second = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject: newSubject(),
      displayName: 'B',
      // 大小写不同也应撞车（比对前归一）
      email: `${idA.toUpperCase()}@EXAMPLE.TEST`,
      userId: idB,
    });
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error('不应成功');
    expect(second.code).toBe('auth.email_conflict');
    expect(await countUsers(idB)).toBe(0);
  });

  it('⑥ 新建默认值：role=user · status=ACTIVE · emailVerified=true · username=displayUsername=subject', async () => {
    const id = newId();
    const subject = newSubject();
    const res = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject,
      displayName: '默认档',
      email: emailOf(id),
      userId: id,
    });
    if (!res.ok) throw new Error(`建号应成功，实得 ${res.code}`);
    const row = await readUser(id);
    expect(row?.role).toBe('user');
    expect(row?.status).toBe('ACTIVE');
    expect(row?.emailVerified).toBe(true);
    expect(row?.username).toBe(subject);
    expect(row?.displayUsername).toBe(subject);
    expect(row?.name).toBe('默认档');
  });

  it('⑦ 建号成对：同事务落 account 行（providerId/accountId/userId + acc_ 前缀 id）', async () => {
    const id = newId();
    const subject = newSubject();
    const res = await rules.ensureDirectoryUser({
      provider: 'oidc',
      subject,
      displayName: '成对',
      email: emailOf(id),
      userId: id,
    });
    if (!res.ok) throw new Error(`建号应成功，实得 ${res.code}`);
    const acc = await readAccount('oidc', subject);
    expect(acc).not.toBeNull();
    expect(acc?.userId).toBe(id);
    expect(acc?.id.startsWith('acc_')).toBe(true);
  });

  it('⑧ 竞态回查（23505）：插入撞主键 ⇒ 回查既有账号 · created=false · 不抛错', async () => {
    const id = newId();
    // 预置：同 id 的 user 行已存在，但**没有** (ldap, subject) 身份行 ⇒ 首查必失手，只能靠 catch 回查
    await insertBareUser(id, emailOf(id));
    const subject = newSubject();
    const res = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject,
      displayName: '竞态',
      // 邮箱也给不同的，确保不撞 email_conflict 分支
      email: `other-${id}@example.test`,
      userId: id,
    });
    if (!res.ok) throw new Error(`竞态回查应成功，实得 ${res.code}`);
    expect(res.created).toBe(false);
    expect(res.account.id).toBe(id);
  });
});

describe('identity rules §5.4 · 状态门（纯函数）', () => {
  it('⑨ DISABLED / PENDING 拒；ACTIVE / null 放行', () => {
    expect(rules.statusError('DISABLED')).toBe('auth.user_disabled');
    expect(rules.statusError('PENDING')).toBe('auth.user_pending');
    expect(rules.statusError('ACTIVE')).toBeNull();
    expect(rules.statusError(null)).toBeNull();
  });
});

describe('identity rules §5.1 · 凭据委派行（M4c-1 T3）', () => {
  it('⑩ 给出 `delegatedPassword` ⇒ 同事务落**两行**：外部身份行 + 凭据委派行（accountId=user.id · password=标记）', async () => {
    const id = newId();
    const subject = newSubject();
    const res = await rules.ensureDirectoryUser({
      provider: 'ldap',
      subject,
      displayName: '委派',
      email: emailOf(id),
      userId: id,
      delegatedPassword: `ldap:${subject}`,
    });
    if (!res.ok) throw new Error(`建号应成功，实得 ${res.code}`);
    const external = await readAccount('ldap', subject);
    expect(external?.userId).toBe(id);
    const delegated = await readAccount('credential', id); // 官方 `findCredentialAccount` 三条件
    expect(delegated).not.toBeNull();
    expect(delegated?.userId).toBe(id);
    const pw = await db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.providerId, 'credential'), eq(account.accountId, id)))
      .limit(1);
    expect(pw[0]?.password).toBe(`ldap:${subject}`); // 非空标记（官方空值直接 401）
  });

  it('⑪ 缺省 `delegatedPassword` ⇒ **零额外行**（OIDC 等无口令语义通道零变化）', async () => {
    const id = newId();
    const subject = newSubject();
    const res = await rules.ensureDirectoryUser({
      provider: 'oidc',
      subject,
      displayName: '无委派',
      email: emailOf(id),
      userId: id,
    });
    if (!res.ok) throw new Error(`建号应成功，实得 ${res.code}`);
    const rows = await db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, id));
    expect(rows.map((r) => r.providerId)).toEqual(['oidc']);
  });
});
