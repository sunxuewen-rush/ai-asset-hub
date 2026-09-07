import { z } from 'zod';
import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { namespace } from './namespaces.js';
import { userAccount } from './users.js';

/**
 * 资产域（08 §5）：asset / asset_version / asset_file。
 * 本 plan 只落表（M2/M3 管线消费），slug 跨类型唯一键 type 不入（01 §3.3）。
 */

/** 资产类型（01 §2 类型登记：skill/mcp/agent） */
export const assetTypeSchema = z.enum(['skill', 'mcp', 'agent']);
export type AssetType = z.infer<typeof assetTypeSchema>;

/** asset.status（08 §5.1） */
export const assetStatusSchema = z.enum(['ACTIVE', 'HIDDEN', 'ARCHIVED']);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

/** asset.visibility（08 §5.1，默认 PUBLIC 全站可见） */
export const visibilitySchema = z.enum(['PUBLIC', 'NAMESPACE_ONLY', 'PRIVATE']);
export type Visibility = z.infer<typeof visibilitySchema>;

/** asset_version.status 六态全序（08 §7） */
export const versionStatusSchema = z.enum([
  'DRAFT',
  'SCANNING',
  'SCAN_FAILED',
  'UPLOADED',
  'PENDING_REVIEW',
  'PUBLISHED',
]);
export type VersionStatus = z.infer<typeof versionStatusSchema>;

export const asset = pgTable(
  'asset',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    namespaceId: bigserial('namespace_id', { mode: 'number' })
      .notNull()
      .references(() => namespace.id),
    type: text('type').$type<AssetType>().notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),
    /** 主要维护人（05 §6.5：空间 ADMIN 完整管理权不依赖 owner） */
    ownerId: varchar('owner_id', { length: 128 })
      .notNull()
      .references(() => userAccount.id),
    /** 冗余指针免 join（08 §5.1；应用层事务内回填，不设 DB FK——避免 schema 循环引用） */
    latestVersionId: bigserial('latest_version_id', { mode: 'number' }),
    visibility: text('visibility').$type<Visibility>().notNull().default('PUBLIC'),
    status: text('status').$type<AssetStatus>().notNull().default('ACTIVE'),
    downloadCount: bigint('download_count', { mode: 'number' }).notNull().default(0),
    createdBy: varchar('created_by', { length: 128 }).references(() => userAccount.id),
    updatedBy: varchar('updated_by', { length: 128 }).references(() => userAccount.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 01 §3.3：slug 跨类型唯一（type 不在唯一键）
    unique('uq_asset_namespace_slug').on(t.namespaceId, t.slug),
    index('idx_asset_namespace_status').on(t.namespaceId, t.status),
  ],
);

export const assetVersion = pgTable(
  'asset_version',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    assetId: bigserial('asset_id', { mode: 'number' })
      .notNull()
      .references(() => asset.id),
    version: varchar('version', { length: 64 }).notNull(),
    /** 六态全序见 08 §7 */
    status: text('status').$type<VersionStatus>().notNull().default('DRAFT'),
    changelog: text('changelog'),
    /** 元数据投影（01 §3.2） */
    parsedMetadataJson: jsonb('parsed_metadata_json').$type<Record<string, unknown>>(),
    /** 族协议 manifest 规范化结果（02/03/04） */
    manifestJson: jsonb('manifest_json').$type<Record<string, unknown>>(),
    fileCount: integer('file_count').notNull().default(0),
    totalSize: bigint('total_size', { mode: 'number' }).notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 128 }).references(() => userAccount.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_asset_version_asset_version').on(t.assetId, t.version),
    index('idx_asset_version_asset_status').on(t.assetId, t.status),
  ],
);

export const assetFile = pgTable(
  'asset_file',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    versionId: bigserial('version_id', { mode: 'number' })
      .notNull()
      .references(() => assetVersion.id),
    filePath: varchar('file_path', { length: 512 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    contentType: varchar('content_type', { length: 128 }),
    /** 逐文件 sha256：下载后校验双通道（08 §5.3） */
    sha256: varchar('sha256', { length: 64 }).notNull(),
    /** 对象存储 key（删除版本按 key 清理） */
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('uq_asset_file_version_path').on(t.versionId, t.filePath)],
);
