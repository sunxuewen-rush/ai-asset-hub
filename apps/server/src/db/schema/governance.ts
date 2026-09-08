import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { asset, assetVersion } from './assets.js';
import { namespace } from './namespaces.js';
import { userAccount } from './users.js';

/**
 * 治理域（08 §6 v1.1）：review_task / label_definition / label_translation /
 * asset_label / audit_log。
 */

/** review_task.status（08 §6 三态 → M3 补 WITHDRAWN：撤回提审保留行置态——历史留档
 *  保 review version 递增（08 §6「重审计数递增」依赖历史行 max）；skillhub 删行是其无
 *  递增语义的简化，AIH 自有契约优先——design §3.5 R6 修正） */
export const reviewStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

/** label_definition.type（06 §1：RECOMMENDED 功能分类 / PRIVILEGED 特权标记） */
export const labelTypeSchema = z.enum(['RECOMMENDED', 'PRIVILEGED']);
export type LabelType = z.infer<typeof labelTypeSchema>;

export const reviewTask = pgTable(
  'review_task',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    assetVersionId: bigserial('asset_version_id', { mode: 'number' })
      .notNull()
      .references(() => assetVersion.id),
    namespaceId: bigserial('namespace_id', { mode: 'number' })
      .notNull()
      .references(() => namespace.id),
    status: text('status').$type<ReviewStatus>().notNull().default('PENDING'),
    /** 重审计数，递增（08 §6：原版本号不变、review version+1） */
    version: integer('version').notNull().default(1),
    submittedBy: varchar('submitted_by', { length: 128 })
      .notNull()
      .references(() => userAccount.id),
    reviewedBy: varchar('reviewed_by', { length: 128 }).references(() => userAccount.id),
    reviewComment: text('review_comment'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (t) => [
    // D6：同版本不允许并发多个待审（DB 硬约束）
    uniqueIndex('uq_review_task_version_pending')
      .on(t.assetVersionId)
      .where(sql`status = 'PENDING'`),
    index('idx_review_task_namespace_status').on(t.namespaceId, t.status),
    index('idx_review_task_submitted_by_status').on(t.submittedBy, t.status),
  ],
);

export const labelDefinition = pgTable(
  'label_definition',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /** 全局唯一公开标识（kebab-case），API/筛选走它（06 §2.1） */
    slug: varchar('slug', { length: 64 }).notNull(),
    type: text('type').$type<LabelType>().notNull(),
    visibleInFilter: boolean('visible_in_filter').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    /** 自引用父级（NULL = 一级；06 §2.2 应用层锁两级树）——bigint 可空指针
     *  （非 bigserial：serial 隐含 NOT NULL + 自增——一级 label 无法表达，M1 bug 修复） */
    parentId: bigint('parent_id', { mode: 'number' }).references((): any => labelDefinition.id),
    createdBy: varchar('created_by', { length: 128 }).references(() => userAccount.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_label_definition_slug').on(t.slug)],
);

export const labelTranslation = pgTable(
  'label_translation',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    labelId: bigserial('label_id', { mode: 'number' })
      .notNull()
      .references(() => labelDefinition.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 16 }).notNull(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_label_translation_label_locale').on(t.labelId, t.locale)],
);

export const assetLabel = pgTable(
  'asset_label',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    assetId: bigserial('asset_id', { mode: 'number' })
      .notNull()
      .references(() => asset.id, { onDelete: 'cascade' }),
    labelId: bigserial('label_id', { mode: 'number' })
      .notNull()
      .references(() => labelDefinition.id, { onDelete: 'cascade' }),
    createdBy: varchar('created_by', { length: 128 }).references(() => userAccount.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_asset_label').on(t.assetId, t.labelId),
    index('idx_asset_label_label_id').on(t.labelId),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /** 可空 = 匿名（登录失败等无身份动作） */
    actorId: varchar('actor_id', { length: 128 }).references(() => userAccount.id),
    action: varchar('action', { length: 64 }).notNull(),
    targetType: varchar('target_type', { length: 64 }),
    /** VARCHAR 兼容两类主键（user id 字符串 / 资产 id 字符串化） */
    targetId: varchar('target_id', { length: 128 }),
    requestId: varchar('request_id', { length: 64 }),
    clientIp: varchar('client_ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    detail: jsonb('detail').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_log_actor_id').on(t.actorId),
    index('idx_audit_log_created_at').on(t.createdAt),
    index('idx_audit_log_target').on(t.targetType, t.targetId),
  ],
);
