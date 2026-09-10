import {
  bigserial,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';

/**
 * 用户域（M4-pre 扁平化后）：user_account / identity_binding / local_credential / api_token。
 * 平台角色为 `user_account.role` 单值层级列（M4-pre design §2.1）；
 * 权限码表（role/permission/role_permission/user_role_binding）已随 M4-pre 删除。
 * 枚举列 = VARCHAR + 应用层 zod 枚举（08 §2 形态，不建 PG enum）。
 */

/** user_account.status（05 §4.1 账号状态机） */
export const userStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DISABLED']);
export type UserStatus = z.infer<typeof userStatusSchema>;

/**
 * 账号角色（M4-pre design §2.1 / §2.5 P5）：单值层级，判定 = `role >= N`。
 * GUEST 为未登录占位（不可分配）；数值间距预留将来插档。
 */
export const ACCOUNT_ROLE = {
  GUEST: 0,
  USER: 1,
  ADMIN: 10,
  SUPER_ADMIN: 100,
} as const;
export type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE];

/**
 * 账号角色 zod 校验（仅允许可分配的三档；GUEST 由服务端派生不入库）。
 * 形态依据 08 §2「枚举列 = VARCHAR/SMALLINT + 应用层 zod 枚举」（不建 PG enum / CHECK）。
 * 注（M4-pre S1）：当前**无运行时消费者**——唯一写入路径 `db/seed.ts` 用 `ACCOUNT_ROLE` 常量直写；
 * 角色分配的写入侧校验（M4b / 手工 SQL 走应用层）将消费此表，故**保留不删**（plan F13 处置）。
 */
export const accountRoleSchema = z.union([
  z.literal(ACCOUNT_ROLE.USER),
  z.literal(ACCOUNT_ROLE.ADMIN),
  z.literal(ACCOUNT_ROLE.SUPER_ADMIN),
]);

export const userAccount = pgTable(
  'user_account',
  {
    /** 稳定字符串主键（05 §2）：本地注册 usr_<uuid>，外部源建号取映射值 */
    id: varchar('id', { length: 128 }).primaryKey(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    email: varchar('email', { length: 256 }),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    status: text('status').$type<UserStatus>().notNull().default('ACTIVE'),
    /** 平台角色（M4-pre）：0 未登录 / 1 用户（默认）/ 10 管理 / 100 超管 */
    role: smallint('role').$type<AccountRole>().notNull().default(ACCOUNT_ROLE.USER),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_user_account_email').on(t.email),
    index('idx_user_account_status').on(t.status),
    index('idx_user_account_role').on(t.role),
  ],
);

export const identityBinding = pgTable(
  'identity_binding',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    provider: varchar('provider', { length: 64 }).notNull(),
    /** 外部身份 subject（OIDC sub / LDAP DN 等，256 防长 DN 截断） */
    providerSubject: varchar('provider_subject', { length: 256 }).notNull(),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => userAccount.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_identity_binding_provider_subject').on(t.provider, t.providerSubject),
    index('idx_identity_binding_user_id').on(t.userId),
  ],
);

export const localCredential = pgTable(
  'local_credential',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => userAccount.id),
    /** 本地登录名（独立于身份 id；LDAP 用户无此行 05 §3.1） */
    username: varchar('username', { length: 64 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    /** 行级失败锁定（05 §3.1 防爆破，多实例仍生效） */
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_local_credential_username').on(t.username),
    unique('uq_local_credential_user_id').on(t.userId),
  ],
);

export const apiToken = pgTable(
  'api_token',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => userAccount.id),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    /** scope 码（05 §5：平台通用凭证，可设 scope/到期；签发面后置） */
    scope: text('scope'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_api_token_token_hash').on(t.tokenHash),
    index('idx_api_token_user_id').on(t.userId),
  ],
);
