/**
 * 版本包下载服务（M3 design §7.2 R13——五档授权 + presigned/流式双路径）。
 * 授权语义（design §7.2 分档；资产读面由调用方先行——PUBLIC 匿名可下 00 §2.3）：
 * - PUBLISHED      → 按资产可见性公开下载（到本层即资产读面已过）
 * - UPLOADED       → 预览授权集可下（08 §7「包可下载但未进审核」——withdraw 回退定稿自查）
 * - PENDING_REVIEW → 预览授权集可下（审核人取真包审内容——清单 sha256 只验结构不验内容）
 * - DRAFT/SCAN_FAILED/REJECTED → 禁下（未公开留档族——version_not_published 明示）
 * - YANKED         → 禁下（曾公开已撤回分发——version_yanked）
 * 下载不入审计（R13 拍板）；download_count 授权过即自增（原子 sql 增量）。
 */
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { asset, type VersionStatus } from '../db/schema/index.js';
import type { ObjectStorage } from '../storage/types.js';
import { AssetError, assetErrorCodes } from './errors.js';

/** 下载判定输入（路由层组装——复用 assertAssetReadable 的 viewer 上下文） */
export interface DownloadViewer {
  viewerId: string | null;
  isSuperAdmin: boolean;
  isPlatformReviewer: boolean;
}

/** 预览授权集（design §3.6 R7 同集 → M4-pre：owner / 上传者 / 管理档（isPlatformReviewer）/ 超管；
 *  原空间 ADMIN/OWNER 面随空间删除） */
export function canDownloadPreview(
  viewer: DownloadViewer,
  assetOwnerId: string,
  version: { createdBy: string | null },
): boolean {
  if (viewer.isSuperAdmin || viewer.isPlatformReviewer) return true;
  if (viewer.viewerId === null) return false;
  if (viewer.viewerId === assetOwnerId) return true;
  if (viewer.viewerId === version.createdBy) return true;
  return false;
}

export type DownloadDecision = { kind: 'yanked' } | { kind: 'not_published' } | { kind: 'ok' };

/** 版本态下载判定（纯函数——状态分档 + 授权集；错误码分派由调用方按 kind 落） */
export function decideDownload(
  status: VersionStatus,
  viewer: DownloadViewer,
  assetOwnerId: string,
  version: { createdBy: string | null },
): DownloadDecision {
  switch (status) {
    case 'PUBLISHED':
      return { kind: 'ok' };
    case 'YANKED':
      return { kind: 'yanked' };
    case 'UPLOADED':
    case 'PENDING_REVIEW':
      return canDownloadPreview(viewer, assetOwnerId, version)
        ? { kind: 'ok' }
        : { kind: 'not_published' };
    default: // DRAFT / SCANNING / SCAN_FAILED / REJECTED
      return { kind: 'not_published' };
  }
}

export interface ResolveDownloadInput {
  assetId: number;
  versionRow: { id: number; status: VersionStatus; bundleStorageKey: string | null };
}

export interface ResolvedDownload {
  /** 直链（S3 实现）；null = 服务端流式兜底 */
  presignedUrl: string | null;
  bundleKey: string;
  downloadCount: number;
}

/**
 * 解析下载目标 + 计数（授权已判定通过——调用方负责 decideDownload 拒绝面）。
 * count++ 授权过即计（design §7.2 R13）；presigned 由存储实现决定（Local null → 流式）。
 */
export async function resolveDownload(
  db: Db,
  storage: ObjectStorage,
  input: ResolveDownloadInput,
): Promise<ResolvedDownload> {
  const { assetId, versionRow } = input;
  if (!versionRow.bundleStorageKey) {
    // 理论不可达防御（M3 起上传必存 bundle——防 500 明示，design Q3）
    throw new AssetError(assetErrorCodes.bundleMissing);
  }
  const presignedUrl = await storage.presignedGetUrl(versionRow.bundleStorageKey, {
    downloadFilename: `bundle-${versionRow.id}.zip`,
  });
  // count++（原子 sql 增量——并发安全）
  const [row] = await db
    .update(asset)
    .set({ downloadCount: sql`${asset.downloadCount} + 1`, updatedAt: new Date() })
    .where(eq(asset.id, assetId))
    .returning({ downloadCount: asset.downloadCount });
  return {
    presignedUrl,
    bundleKey: versionRow.bundleStorageKey,
    downloadCount: row?.downloadCount ?? 0,
  };
}
