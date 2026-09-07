import { z } from 'zod';
import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { userAccount } from './users.js';

/**
 * 空间域（08 §4）：namespace / namespace_member。
 */

/** namespace.type（08 §4） */
export const namespaceTypeSchema = z.enum(['GLOBAL', 'TEAM']);
export type NamespaceType = z.infer<typeof namespaceTypeSchema>;

/** namespace.status（05 §6.2） */
export const namespaceStatusSchema = z.enum(['ACTIVE', 'FROZEN', 'ARCHIVED']);
export type NamespaceStatus = z.infer<typeof namespaceStatusSchema>;

/** namespace_member.role（05 §6.2） */
export const namespaceRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export type NamespaceRole = z.infer<typeof namespaceRoleSchema>;

export const namespace = pgTable(
  'namespace',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    type: text('type').$type<NamespaceType>().notNull(),
    description: text('description'),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    status: text('status').$type<NamespaceStatus>().notNull().default('ACTIVE'),
    createdBy: varchar('created_by', { length: 128 }).references(() => userAccount.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_namespace_slug').on(t.slug)],
);

export const namespaceMember = pgTable(
  'namespace_member',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    namespaceId: bigserial('namespace_id', { mode: 'number' })
      .notNull()
      .references(() => namespace.id),
    userId: varchar('user_id', { length: 128 })
      .notNull()
      .references(() => userAccount.id),
    role: text('role').$type<NamespaceRole>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_namespace_member').on(t.namespaceId, t.userId),
    index('idx_namespace_member_user_id').on(t.userId),
    index('idx_namespace_member_namespace_id').on(t.namespaceId),
  ],
);
