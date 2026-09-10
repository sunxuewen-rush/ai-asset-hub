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
import { z } from 'zod';
import { userAccount } from './users.js';

/**
 * 资产域（08 §5）：asset / asset_version / asset_file。
 * M4-pre 扁平化：坐标去命名空间维度 → **全局唯一裸 `slug`**（`UNIQUE(slug)`，type 不入唯一键，01 §3.3）。
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

/** asset_version.status 八态全序（08 §7 六态 → M3 补全 REJECTED/YANKED——skillhub 八态同源） */
export const versionStatusSchema = z.enum([
  'DRAFT',
  'SCANNING',
  'SCAN_FAILED',
  'UPLOADED',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'YANKED',
]);
export type VersionStatus = z.infer<typeof versionStatusSchema>;

export const asset = pgTable(
  'asset',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    type: text('type').$type<AssetType>().notNull(),
    slug: varchar('slug', { length: 64 }).notNull(),
    /** 主要维护人（05 §6.5 → M4-pre：owner 本人 ∨ `role >= ADMIN` 可管，无空间角色） */
    ownerId: varchar('owner_id', { length: 128 })
      .notNull()
      .references(() => userAccount.id),
    /** 冗余指针免 join（08 §5.1；应用层事务内回填——approve 指向/yank 重算，不设 DB FK） */
    latestVersionId: bigint('latest_version_id', { mode: 'number' }),
    visibility: text('visibility').$type<Visibility>().notNull().default('PUBLIC'),
    status: text('status').$type<AssetStatus>().notNull().default('ACTIVE'),
    downloadCount: bigint('download_count', { mode: 'number' }).notNull().default(0),
    createdBy: varchar('created_by', { length: 128 }).references(() => userAccount.id),
    updatedBy: varchar('updated_by', { length: 128 }).references(() => userAccount.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 01 §3.3 → M4-pre §2.3：全局唯一坐标（跨类型唯一，type 不在唯一键）
    unique('uq_asset_slug').on(t.slug),
    index('idx_asset_status').on(t.status),
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
    /** 八态全序见 08 §7（M3 补全 REJECTED/YANKED——design §3.4/§4.1） */
    status: text('status').$type<VersionStatus>().notNull().default('DRAFT'),
    changelog: text('changelog'),
    /** 元数据投影（01 §3.2） */
    parsedMetadataJson: jsonb('parsed_metadata_json').$type<Record<string, unknown>>(),
    /** 族协议 manifest 规范化结果（02/03/04） */
    manifestJson: jsonb('manifest_json').$type<Record<string, unknown>>(),
    fileCount: integer('file_count').notNull().default(0),
    totalSize: bigint('total_size', { mode: 'number' }).notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** yank 留痕（M3 §4.1——skillhub SkillVersion 同构：撤回留痕，reason 必填由调用方校验） */
    yankedAt: timestamp('yanked_at', { withTimezone: true }),
    yankedBy: varchar('yanked_by', { length: 128 }).references(() => userAccount.id),
    yankReason: text('yank_reason'),
    /** bundle 副本（M3 §7.1——上传原 zip 顺存；zip 整体 sha256 供双通道校验，08 §5.3） */
    bundleStorageKey: varchar('bundle_storage_key', { length: 512 }),
    bundleSha256: varchar('bundle_sha256', { length: 64 }),
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
