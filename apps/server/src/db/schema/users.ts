import {
  bigserial,
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';

/**
 * 用户域（08 §3 v1.1）：user_account / identity_binding / local_credential / api_token
 * / user_role_binding / role / permission / role_permission。
 * 枚举列 = VARCHAR + 应用层 zod 枚举（08 §2 形态，不建 PG enum）。
 */

/** user_account.status（05 §4.1 账号状态机） */
export const userStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DISABLED']);
export type UserStatus = z.infer<typeof userStatusSchema>;

/** 平台角色 code（05 §6.1，大写蛇形；种子与判定共用） */
export const roleCodeSchema = z.enum(['SUPER_ADMIN', 'ASSET_ADMIN', 'USER_ADMIN', 'AUDITOR']);
export type RoleCode = z.infer<typeof roleCodeSchema>;

export const userAccount = pgTable(
  'user_account',
  {
    /** 稳定字符串主键（05 §2）：本地注册 usr_<uuid>，外部源建号取映射值 */
    id: varchar('id', { length: 128 }).primaryKey(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    email: varchar('email', { length: 256 }),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    status: text('status').$type<UserStatus>().notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_user_account_email').on(t.email),
    index('idx_user_account_status').on(t.status),
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

export const role = pgTable(
  'role',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    code: varchar('code', { length: 64 }).$type<RoleCode>().notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    description: varchar('description', { length: 512 }),
    /** 内置角色（随种子）系统标记 */
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_role_code').on(t.code)],
);

export const permission = pgTable(
  'permission',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    code: varchar('code', { length: 128 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    /** 权限面扩展（05 §6.4 码分组：asset/review/namespace/promotion/user/audit） */
    groupCode: varchar('group_code', { length: 64 }),
  },
  (t) => [unique('uq_permission_code').on(t.code)],
);

export const rolePermission = pgTable(
  'role_permission',
  {
    roleId: bigserial('role_id', { mode: 'number' })
      .notNull()
      .references(() => role.id),
    permissionId: bigserial('permission_id', { mode: 'number' })
      .notNull()
      .references(() => permission.id),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRoleBinding = pgTable(
  'user_role_binding',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => userAccount.id),
    roleId: bigserial('role_id', { mode: 'number' })
      .notNull()
      .references(() => role.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_user_role_binding_user_role').on(t.userId, t.roleId),
    index('idx_user_role_binding_user_id').on(t.userId),
  ],
);
