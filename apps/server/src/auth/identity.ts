import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { account, user } from '../db/schema/index.js';
import { type AuthSurfaceCode, OFFICIAL_BANNED_CODE } from './errors.js';

/**
 * 身份源共享模块（M4c-1 批 design §5.4 · 主 design §3.4）——**两条以上身份通道共用的产品规则**。
 *
 * 现雏形 = `plugins/ldap-credentials.ts` 内的 `ensureDirectoryUser`（M4b-pre 落仓）；
 * 本件按批 design §5.4 抽出为独立模块，纳入 M4c-1 的**重定向通道**（官方内置 provider 建号流程）
 * 与**目录通道**（官方 `sign-in/username` 的 before 钩子）共用的规则面。
 *
 * ## 职责（批 design §5.4 表，逐条对应本文件实现）
 * | 职责 | 落点 |
 * |------|------|
 * | 身份复用与漂移同步 | `ensureDirectoryUser` 命中 `(providerId, accountId)` ⇒ 复用 + 同步显示名 |
 * | 邮箱归一化与必填（**目录通道**） | 统一 `trim().toLowerCase()`；缺失即拒，**绝不合成** |
 * | 显示名与默认档 | `user.name` ← 目录属性；新建默认 `role='user'`（用户档） |
 * | 账号链接策略 | **唯一实现处** —— 撞邮箱处置见下方「链接策略」注（本批只承载，M4c-3 接线） |
 * | 审计 | 登录来源与结果事件由**调用方**写（它才持 `ctx` 元信息）；本模块只回 `created` 供其判定，沿用既有 `auth.login.*` 动作、**不新增动作名** |
 *
 * ## 定位声明
 * 本模块**不是**与官方并行的第二套建号机制，而是**挂在官方钩子下游**的规则实现 ——
 * 两个入口都是官方的（官方端点上的 `hooks.before` · 官方 provider 的建号流程）。
 *
 * ## 职责增补（M4c-1 T3：凭据委派行）
 * 「凭据委派行」（providerId=`credential` · accountId=`user.id` · password=`ldap:<工号>`，批 design §5.1）
 * 由本模块在**建号事务内**一并写入（可选入参 `delegatedPassword`）——避免「用户已建但无凭据行 ⇒
 * 官方 `sign-in/username` 永久 401」。D6 迁移 `0015` 只负责**存量**账号，两者口径一致。
 *
 * ## 行为口径（M4c-1 T1：抽取，零行为变化）
 * 本件为**纯规则函数**：不含任何自绘 HTTP 端点、不写审计、不签发会话
 * （会话签发属官方件，留在 `plugins/ldap-credentials.ts` 的 `issueSession`）。
 */

/** 官方凭据 provider 常量（`findCredentialAccount` 三条件之一；批 design §5.1） */
export const CREDENTIAL_PROVIDER = 'credential';

/** 平台账号行（规则判定所需列；`user` 表的子集） */
export interface AccountRow {
  id: string;
  displayName: string;
  email: string | null;
  status: string | null;
  role: string | null;
}

/** 建号/复用入参 */
export interface DirectoryIdentityInput {
  provider: string;
  subject: string;
  displayName: string;
  email: string | null;
  /** 建号主键：LDAP = 工号（沿用旧实现 D3）；OIDC = `usr_oidc_<uuid>` */
  userId: string;
  /**
   * 凭据委派行的 `password` 值（**非空标记**，批 design §5.1）：目录通道传 `ldap:<工号>`；
   * 给出即在**建号事务内**补一行 `providerId='credential'` · `accountId=user.id` 的凭据委派行
   * ⇒ 官方 `sign-in/username` 的 `findCredentialAccount` 才能命中（M4c-1 T3）。
   * 缺省不写（OIDC 通道等无口令语义的通道零变化）。
   */
  delegatedPassword?: string;
}

/** 建号/复用结果（`created` 供调用方决定是否写 provision 审计） */
export type EnsureDirectoryUserResult =
  | { ok: true; account: AccountRow; created: boolean }
  | { ok: false; code: AuthSurfaceCode };

export interface IdentityRulesDeps {
  db: Db;
}

/** 身份源共享规则集（工厂形态，与 `directoryCredentials(deps)` 同款惯例） */
export function createIdentityRules(deps: IdentityRulesDeps) {
  const { db } = deps;

  /** 外部身份 → 平台账号（`(providerId, accountId)` 唯一定位） */
  async function findExternalUser(provider: string, subject: string): Promise<AccountRow | null> {
    const rows = await db
      .select({
        id: user.id,
        displayName: user.name,
        email: user.email,
        status: user.status,
        role: user.role,
      })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id))
      .where(and(eq(account.providerId, provider), eq(account.accountId, subject)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * 账号状态门（05 §4.1：非启用态拒全部）——**码面 = 官方 `BANNED_USER`**（主 design R19 / §6.2）。
   *
   * `DISABLED` 与遗留 `PENDING` **行为不变（仍拒）**，仅对外码面收敛为官方码；
   * `PENDING` 概念与枚举随列退休归 M4c-2（主 design §4.7）。
   */
  function statusError(status: string | null): AuthSurfaceCode | null {
    if (status === 'DISABLED' || status === 'PENDING') return OFFICIAL_BANNED_CODE;
    return null;
  }

  /**
   * 目录建号/复用（design R15 第 5 步）——替代原 `auth/provision.ts`：
   * 1. `(provider, subject)` 命中 → 复用（防同一外部身份双账号）+ 显示名漂移同步
   * 2. 未命中 → **邮箱必填**（缺失即拒，绝不合成）· **邮箱冲突即拒**（同邮箱两身份需人工处置）
   * 3. 建 `user`（`status='ACTIVE'` · `role='user'` 默认档 · `username`=subject）
   *    + `account`（`account_id` = subject）——一个事务内
   *
   * **链接策略（批 design §5.4「唯一实现处」）**：撞邮箱的处置**只在本函数第 2 步**决定 ——
   * 本批（M4c-1）保持既有「拒绝」行为（`auth.email_conflict`，零行为变化）；
   * M4c-3 按主 design §2.6 R1 接线为**自动链接**（撞已验证邮箱 ⇒ 合并到既有账号），
   * 届时只改此处，调用方（目录钩子 / provider 建号流程）无需改动。
   */
  async function ensureDirectoryUser(
    input: DirectoryIdentityInput,
  ): Promise<EnsureDirectoryUserResult> {
    const { provider, subject, displayName, email, userId, delegatedPassword } = input;

    const bound = await findExternalUser(provider, subject);
    if (bound) {
      if (bound.displayName !== displayName) {
        await db.update(user).set({ name: displayName }).where(eq(user.id, bound.id));
        bound.displayName = displayName;
      }
      const gate = statusError(bound.status);
      return gate ? { ok: false, code: gate } : { ok: true, account: bound, created: false };
    }

    if (!email) return { ok: false, code: 'auth.email_missing' };
    // 官方写入路径把邮箱小写化（X1 实证）⇒ 比对前统一 lower
    const normalizedEmail = email.trim().toLowerCase();
    const sameEmail = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);
    if (sameEmail.length > 0) return { ok: false, code: 'auth.email_conflict' };

    const insert = async (): Promise<void> => {
      await db.transaction(async (tx) => {
        await tx.insert(user).values({
          id: userId,
          name: displayName,
          email: normalizedEmail,
          emailVerified: true,
          // 目录身份可信（05 §3.1）：直接 ACTIVE + 默认档
          status: 'ACTIVE',
          role: 'user',
          username: subject,
          displayUsername: subject,
        });
        await tx.insert(account).values({
          // 官方 account.id 由 adapter 生成随机串；直写路径自行生成（前缀区分来源，便于排查）
          id: `acc_${crypto.randomUUID()}`,
          providerId: provider,
          accountId: subject,
          userId,
        });
        if (delegatedPassword !== undefined) {
          // 凭据委派行（批 design §5.1）：与 user / 外部身份行**同事务**——半途失败会留下
          // 「用户已建但无凭据行」⇒ 官方 `sign-in/username` 永久 401（T3 契约）。
          await tx.insert(account).values({
            id: `acc_${crypto.randomUUID()}`,
            providerId: CREDENTIAL_PROVIDER,
            accountId: userId,
            password: delegatedPassword,
            userId,
          });
        }
      });
    };

    try {
      await insert();
    } catch (err) {
      // 并发双飞（同邮箱/同工号唯一冲突）→ 回查复用，不重复建号
      const constraint = (err as { cause?: { code?: string } }).cause?.code;
      const raced =
        constraint === '23505'
          ? ((await findExternalUser(provider, subject)) ??
            (
              await db
                .select({
                  id: user.id,
                  displayName: user.name,
                  email: user.email,
                  status: user.status,
                  role: user.role,
                })
                .from(user)
                .where(eq(user.id, userId))
                .limit(1)
            )[0])
          : undefined;
      if (!raced) throw err;
      const gate = statusError(raced.status);
      return gate ? { ok: false, code: gate } : { ok: true, account: raced, created: false };
    }

    const created = await db
      .select({
        id: user.id,
        displayName: user.name,
        email: user.email,
        status: user.status,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    const row = created[0];
    if (!row) throw new Error('identity rules: account row missing after insert');
    return { ok: true, account: row, created: true };
  }

  return { findExternalUser, statusError, ensureDirectoryUser };
}

/** 共享规则集类型（调用方按需注入，便于测试替身） */
export type IdentityRules = ReturnType<typeof createIdentityRules>;
