/**
 * 版本读面服务（M2 T14 → M3 T6 重构；design §3.6 R7——八态显式态分类）。
 * 授权语义（未公开族 vs 曾公开族分治——M3 六态 → 八态后状态全序显式化）：
 * - 未公开族（DRAFT/SCANNING/SCAN_FAILED/UPLOADED/PENDING_REVIEW/REJECTED）：仅
 *   资产 owner / 版本上传者（created_by）/ 空间 ADMIN/OWNER / 平台审核角色（ASSET_ADMIN，
 *   R7 扩展——审核待审/历史面）/ SUPER_ADMIN 可见；无权限者不可见（列表过滤 + 详情
 *   400 version_not_published 由调用方明示——不泄露存在性）。
 * - 曾公开族（PUBLISHED/YANKED）：全可见（资产读面已先行过滤——版本读面端点前置资产
 *   可见判定；YANKED 详情留档公开——曾公开族读面，design §4.1 R9）。
 * 资产读面判定（ns/visibility/403 分层）在 http 层前置——本层只做版本状态授权。
 */
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  assetFile,
  assetVersion,
  type NamespaceRole,
  type VersionStatus,
} from '../db/schema/index.js';

export interface VersionViewer {
  /** null = 匿名（未公开族面恒不可见） */
  viewerId: string | null;
  /** 资产所在空间角色（null = 非成员） */
  namespaceRole: NamespaceRole | null;
  isSuperAdmin: boolean;
  /** 平台审核角色（ASSET_ADMIN——R7 预览授权集扩展：待审/历史面审核人可见） */
  isPlatformReviewer: boolean;
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

/** 未公开族（曾公开族 = PUBLISHED/YANKED——非授权者亦可见，design §3.6 R7/R9） */
const NON_PUBLIC: ReadonlySet<VersionStatus> = new Set([
  'DRAFT',
  'SCANNING',
  'SCAN_FAILED',
  'UPLOADED',
  'PENDING_REVIEW',
  'REJECTED',
]);

/**
 * 未公开族授权（内存判定——行级：上传者本人 or 资产 owner or 空间 ADMIN/OWNER or
 * 平台审核角色 ASSET_ADMIN；曾公开族恒可见。design §3.6 R7 授权集）。
 */
function canViewNonPublic(
  assetOwnerId: string,
  viewer: VersionViewer,
  row: { status: VersionStatus; createdBy: string | null },
): boolean {
  if (!NON_PUBLIC.has(row.status)) return true; // PUBLISHED/YANKED 曾公开族全可见
  if (viewer.viewerId === null) return false; // 匿名无未公开族面
  if (viewer.viewerId === row.createdBy) return true; // 上传者本人（协作语义）
  if (viewer.viewerId === assetOwnerId) return true; // 资产 owner
  if (viewer.namespaceRole === 'OWNER' || viewer.namespaceRole === 'ADMIN') return true;
  return viewer.isPlatformReviewer; // ASSET_ADMIN（R7）
}

/**
 * 未公开族授权 SQL（列表过滤——viewer 身份是调用方已知常量，拼接进 OR：
 * 曾公开族恒见 + createdBy 本人 + owner/空间 ADMIN/ASSET_ADMIN 常量短路）。
 * 匿名（viewerId null）→ 仅曾公开族分支（无创建者面）。
 */
function nonPublicVisibleWhere(assetOwnerId: string, viewer: VersionViewer): ReturnType<typeof or> {
  const publicFacing = inArray(assetVersion.status, ['PUBLISHED', 'YANKED']);
  if (viewer.viewerId === null) {
    return publicFacing;
  }
  const isOwner = assetOwnerId === viewer.viewerId;
  const isAdmin = viewer.namespaceRole === 'OWNER' || viewer.namespaceRole === 'ADMIN';
  return or(
    publicFacing,
    eq(assetVersion.createdBy, viewer.viewerId),
    isOwner ? sql`true` : sql`false`,
    isAdmin ? sql`true` : sql`false`,
    viewer.isPlatformReviewer ? sql`true` : sql`false`,
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
  const where = (() => {
    if (viewer.isSuperAdmin) return eq(assetVersion.assetId, assetId);
    const npv = nonPublicVisibleWhere(assetOwnerId, viewer);
    // 不可达守卫：npv null（理论不可达）→ 恒不命中（防 undefined where 泄漏全量）
    return npv === null
      ? eq(assetVersion.assetId, -1)
      : and(eq(assetVersion.assetId, assetId), npv);
  })();

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

/**
 * 版本详情（含 manifest/投影/文件清单）。三态返回：
 * - null：版本不存在（调用方 404）
 * - 'restricted'：存在但无预览权（非 PUBLISHED 且非授权者——调用方 400 version_not_published，
 *   skillhub error.skill.version.notPublished 对齐——明示语义）
 * - VersionDetail：授权可见
 */
export async function getVersion(
  db: Db,
  assetId: number,
  assetOwnerId: string,
  version: string,
  viewer: VersionViewer,
): Promise<VersionDetail | 'restricted' | null> {
  const rows = await db
    .select()
    .from(assetVersion)
    .where(and(eq(assetVersion.assetId, assetId), eq(assetVersion.version, version)));
  const row = rows[0];
  if (!row) return null;
  if (!viewer.isSuperAdmin && !canViewNonPublic(assetOwnerId, viewer, row)) return 'restricted';

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
