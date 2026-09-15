import { bigserial, index, pgTable, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';
import { user } from './auth.js';

/**
 * 过渡期残留：`api_token`（M4b-pre 时序，design §5.1）。
 *
 * M4b-pre T3 已把用户域（`user_account` / `identity_binding` / `local_credential`）整体迁到官方
 * `auth.ts`（6 张官方模型表），本文件只剩**令牌存储表**——它的消费面（`http/tokens.ts` /
 * `token-middleware.ts` / `device-routes.ts`）随 **T4（令牌面切流）** 一起切到官方 `apikey`
 * （含 re-encode 迁移 `0010`），届时本文件删除。
 *
 * 注意：本表的 `user_id` 外键已随 T3 的 `0009` 重指向官方 `user` 表（单真值源）。
 */

export const apiToken = pgTable(
  'api_token',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => user.id),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    /** scope 码（05 §5：平台通用凭证，可设 scope/到期）；空/`cli` = 全量 */
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
