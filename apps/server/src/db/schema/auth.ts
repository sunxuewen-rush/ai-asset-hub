import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';

/**
 * 认证域表定义（M4b-pre design §5.1）：6 张官方 better-auth 模型表。
 *
 * **本文件是官方 CLI 产物，不是手写件**——列/索引/约束的唯一真值源是
 * `apps/server/src/auth/better-auth.ts` 的 `authOptions()`（含插件集合），
 * 换列请改 options 后重跑：
 *
 * ```bash
 * cd apps/server
 * bun x auth@latest generate --config <临时配置> --adapter drizzle --dialect pg --output <目标> -y
 * ```
 *
 * 已核实项（T2 断言①）：`user.status` 出现在产物中（来自 options 的
 * `user.additionalFields`）· `username`/`displayUsername`（username 插件）·
 * `device_code`（deviceAuthorization 插件）· `apikey`（api-key 插件）。
 *
 * 旧表已全部收口（design §5.1 时序原则）：`user_account`/`identity_binding`/`local_credential`
 * 随 T3 的 `0010` 删除；`api_token` 随 T4 的 `0011` 删除（过渡期文件 `./users.ts` 同步下线）。
 *
 * 注：官方产物对 `apikey.key` 建的是**普通索引**（非唯一约束）——key 存
 * `base64url(sha256(明文))`，唯一性由生成算法保证；不额外加约束，避免偏离官方形态。
 */

/**
 * `user.status`（05 §4.1 账号状态机）——M4b-pre T3：原 `db/schema/users.ts` 的
 * `userStatusSchema` 随用户域表定义一并迁入（08 §2：枚举列 = `text` + 应用层 zod 枚举，不建 PG enum）。
 */
export const userStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DISABLED']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  /** 05 §4.1 账号状态机（三态单值真值列，design R5；`input:false` ⇒ 只由服务端写） */
  status: text('status').default('ACTIVE'),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    /** 本地口令（`credential` provider；哈希格式自描述，见 design R10） */
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const deviceCode = pgTable(
  'device_code',
  {
    id: text('id').primaryKey(),
    deviceCode: text('device_code').notNull(),
    userCode: text('user_code').notNull(),
    userId: text('user_id'),
    expiresAt: timestamp('expires_at').notNull(),
    status: text('status').notNull(),
    lastPolledAt: timestamp('last_polled_at'),
    pollingInterval: integer('polling_interval'),
    clientId: text('client_id'),
    scope: text('scope'),
  },
  (table) => [
    uniqueIndex('deviceCode_deviceCode_uidx').on(table.deviceCode),
    uniqueIndex('deviceCode_userCode_uidx').on(table.userCode),
  ],
);

export const apikey = pgTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    configId: text('config_id').default('default').notNull(),
    name: text('name'),
    start: text('start'),
    referenceId: text('reference_id').notNull(),
    prefix: text('prefix'),
    /** `base64url(sha256(明文))`——与旧 `api_token.token_hash`（hex）是同一字节串的两种编码 */
    key: text('key').notNull(),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: timestamp('last_refill_at'),
    enabled: boolean('enabled').default(true),
    rateLimitEnabled: boolean('rate_limit_enabled').default(true),
    rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
    rateLimitMax: integer('rate_limit_max').default(10),
    requestCount: integer('request_count').default(0),
    remaining: integer('remaining'),
    lastRequest: timestamp('last_request'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    /** 权限码 JSON（`{asset:['publish']}`）；NULL = 全量（design §5.3） */
    permissions: text('permissions'),
    metadata: text('metadata'),
  },
  (table) => [
    index('apikey_configId_idx').on(table.configId),
    index('apikey_referenceId_idx').on(table.referenceId),
    index('apikey_key_idx').on(table.key),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
