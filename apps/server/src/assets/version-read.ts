/**
 * 版本读面服务（M2 T14；design §6 Q1——DRAFT 状态可见性过滤）。
 * 授权语义：DRAFT 仅 资产 owner / 版本上传者（created_by）/ 空间 ADMIN+ 可见；
 * 无权限者不可见（列表过滤 + 详情由调用方 404——不泄露存在性）。
 * PUBLISHED（M3 才有）→ 全可见（资产读面已先行过滤——版本读面端点前置资产可见判定）。
 * 资产读面判定（ns/visibility/403 分层）在 http 层前置——本层只做版本状态授权。
 */
import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  assetFile,
  assetVersion,
  type NamespaceRole,
  type VersionStatus,
} from '../db/schema/index.js';

export interface VersionViewer {
  /** null = 匿名（DRAFT 面恒不可见） */
  viewerId: string | null;
  /** 资产所在空间角色（null = 非成员） */
  namespaceRole: NamespaceRole | null;
  isSuperAdmin: boolean;
}

export interface VersionListItem {
  id: number;
  version: string;
  status: VersionStatus;
  fileCount: number;
  totalSize: number;
  changelog: string | null;
  createdAt: Date;
}

export interface VersionFileMeta {
  filePath: string;
  fileSize: number;
  sha256: string;
  storageKey: string;
}

export interface VersionDetail extends VersionListItem {
  manifestJson: Record<string, unknown> | null;
  parsedMetadataJson: Record<string, unknown> | null;
  files: VersionFileMeta[];
}

/**
 * DRAFT 授权 SQL（viewer 可看 DRAFT：上传者本人 or 资产 owner or 空间 ADMIN+）。
 * owner/ADMIN 是常量判定（调用方已知 viewer 身份）——真值/假值拼接进 OR 条件；
 * 匿名（viewerId null）→ 仅 PUBLISHED 分支（M2 无——全空）。
 */
function draftVisibleWhere(assetOwnerId: string, viewer: VersionViewer): ReturnType<typeof or> {
  if (viewer.viewerId === null) {
    return ne(assetVersion.status, 'DRAFT');
  }
  const isOwner = assetOwnerId === viewer.viewerId;
  const isAdmin = viewer.namespaceRole === 'OWNER' || viewer.namespaceRole === 'ADMIN';
  return or(
    ne(assetVersion.status, 'DRAFT'),
    eq(assetVersion.createdBy, viewer.viewerId),
    isOwner ? sql`true` : sql`false`,
    isAdmin ? sql`true` : sql`false`,
  );
}

export interface ListVersionsOptions {
  limit: number;
  offset: number;
}

export async function listVersions(
  db: Db,
  assetId: number,
  assetOwnerId: string,
  viewer: VersionViewer,
  opts: ListVersionsOptions,
): Promise<{ items: VersionListItem[]; total: number }> {
  const where = viewer.isSuperAdmin
    ? eq(assetVersion.assetId, assetId)
    : and(eq(assetVersion.assetId, assetId), draftVisibleWhere(assetOwnerId, viewer))!;

  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: assetVersion.id,
        version: assetVersion.version,
        status: assetVersion.status,
        fileCount: assetVersion.fileCount,
        totalSize: assetVersion.totalSize,
        changelog: assetVersion.changelog,
        createdAt: assetVersion.createdAt,
      })
      .from(assetVersion)
      .where(where)
      .orderBy(desc(assetVersion.createdAt), desc(assetVersion.id))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ n: sql<number>`count(*)` }).from(assetVersion).where(where),
  ]);
  return { items, total: Number(totalRows[0]?.n ?? 0) };
}

/** 版本详情（含 manifest/投影/文件清单）；不可见/不存在 → null（调用方 404） */
export async function getVersion(
  db: Db,
  assetId: number,
  assetOwnerId: string,
  version: string,
  viewer: VersionViewer,
): Promise<VersionDetail | null> {
  const rows = await db
    .select()
    .from(assetVersion)
    .where(
      viewer.isSuperAdmin
        ? and(eq(assetVersion.assetId, assetId), eq(assetVersion.version, version))
        : and(
            eq(assetVersion.assetId, assetId),
            eq(assetVersion.version, version),
            draftVisibleWhere(assetOwnerId, viewer),
          ),
    );
  const row = rows[0];
  if (!row) return null;

  const files = await db
    .select({
      filePath: assetFile.filePath,
      fileSize: assetFile.fileSize,
      sha256: assetFile.sha256,
      storageKey: assetFile.storageKey,
    })
    .from(assetFile)
    .where(eq(assetFile.versionId, row.id))
    .orderBy(assetFile.filePath);

  return {
    id: row.id,
    version: row.version,
    status: row.status,
    fileCount: row.fileCount,
    totalSize: row.totalSize,
    changelog: row.changelog,
    createdAt: row.createdAt,
    manifestJson: row.manifestJson as Record<string, unknown> | null,
    parsedMetadataJson: row.parsedMetadataJson as Record<string, unknown> | null,
    files,
  };
}
