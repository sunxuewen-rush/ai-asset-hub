/**
 * review 读面服务（M3 design §3.7 R8——审核队列/我的提交/详情）。
 * 授权语义（design §9 接口表 + skillhub ReviewPortalAppService 三视图形态）：
 * - 审核队列 listQueue：管理档面（M4-pre：**全站单队列**；原「空间 ADMIN/OWNER → 本空间」与
 *   SUPER_ADMIN → 全平台）——调用方（路由层）判 can('review:approve', nsCtx) 后传参；
 * - 我的提交 listMine：任何登录者看自己的提交（无权限码——身份面）；
 * - 详情 getReviewDetail：review:approve 面 or submitted_by 本人——无权 403 review.access_denied
 *   （对齐 skillhub review.no_permission——DomainForbiddenException 源码实证；不存在 404
 *   review.not_found）。
 * 详情内容 = task 行 + 版本 manifest/文件清单（sha256 审核预览——授权走 task 面，不经
 * version-read 门：提交人本人可能非上传者（owner 代提场景），task 授权通过即内容可读）。
 */
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  asset,
  assetFile,
  assetVersion,
  type ReviewStatus,
  reviewTask,
} from '../db/schema/index.js';
import { ReviewError, reviewErrorCodes } from './errors.js';

export interface QueueFilters {
  /** M4-pre：审核队列为**全站单队列**（空间维度已删除） */
  status?: ReviewStatus;
  limit: number;
  offset: number;
}

export interface ReviewListItem {
  taskId: number;
  status: ReviewStatus;
  /** review 评审计数（08 §6 重审递增） */
  reviewVersion: number;
  submittedBy: string;
  submittedAt: Date;
  /** 资产坐标与版本信息（审核人决策所需；M4-pre：坐标 = 全局唯一裸 slug） */
  assetSlug: string;
  assetVersion: string;
  /** 版本当前状态（PENDING_REVIEW 等——队列中通常 PENDING） */
  versionStatus: string;
  versionId: number;
}

export interface ReviewDetailItem extends ReviewListItem {
  manifestJson: Record<string, unknown> | null;
  /** 文件清单（sha256——内容级审核预览，design §3.7 R8） */
  files: Array<{ filePath: string; fileSize: number; sha256: string }>;
}

const LIST_SELECT = {
  taskId: reviewTask.id,
  status: reviewTask.status,
  reviewVersion: reviewTask.version,
  submittedBy: reviewTask.submittedBy,
  submittedAt: reviewTask.submittedAt,
  assetSlug: asset.slug,
  assetVersion: assetVersion.version,
  versionStatus: assetVersion.status,
  versionId: assetVersion.id,
};

async function baseQuery(filters: QueueFilters, mineViewerId?: string) {
  const conds = [];
  if (filters.status !== undefined) conds.push(eq(reviewTask.status, filters.status));
  if (mineViewerId !== undefined) conds.push(eq(reviewTask.submittedBy, mineViewerId));
  return and(...conds);
}

/** 审核队列（管理档面——路由层判 role 后调用；M4-pre：全站单队列） */
export async function listQueue(
  db: Db,
  filters: QueueFilters,
): Promise<{ items: ReviewListItem[]; total: number }> {
  const where = await baseQuery(filters);
  const [items, totalRows] = await Promise.all([
    db
      .select(LIST_SELECT)
      .from(reviewTask)
      .innerJoin(assetVersion, eq(reviewTask.assetVersionId, assetVersion.id))
      .innerJoin(asset, eq(assetVersion.assetId, asset.id))
      .where(where)
      .orderBy(desc(reviewTask.submittedAt), desc(reviewTask.id))
      .limit(filters.limit)
      .offset(filters.offset),
    db.select({ n: sql<number>`count(*)` }).from(reviewTask).where(where),
  ]);
  return { items: items as ReviewListItem[], total: Number(totalRows[0]?.n ?? 0) };
}

/** 我的提交（登录面——无权限码；status 可选过滤） */
export async function listMine(
  db: Db,
  viewerId: string,
  filters: QueueFilters,
): Promise<{ items: ReviewListItem[]; total: number }> {
  const where = await baseQuery(filters, viewerId);
  const [items, totalRows] = await Promise.all([
    db
      .select(LIST_SELECT)
      .from(reviewTask)
      .innerJoin(assetVersion, eq(reviewTask.assetVersionId, assetVersion.id))
      .innerJoin(asset, eq(assetVersion.assetId, asset.id))
      .where(where)
      .orderBy(desc(reviewTask.submittedAt), desc(reviewTask.id))
      .limit(filters.limit)
      .offset(filters.offset),
    db.select({ n: sql<number>`count(*)` }).from(reviewTask).where(where),
  ]);
  return { items: items as ReviewListItem[], total: Number(totalRows[0]?.n ?? 0) };
}

/**
 * 详情（task 面授权：review:approve 面 or 提交人本人——无权 403）。
 * 不存在 → 404 review.not_found（load 先行）。
 */
export async function getReviewDetail(
  db: Db,
  input: { taskId: number; viewerId: string | null; canApprove: boolean },
): Promise<ReviewDetailItem> {
  const { taskId, viewerId, canApprove } = input;
  const rows = await db
    .select({
      ...LIST_SELECT,
      manifestJson: assetVersion.manifestJson,
    })
    .from(reviewTask)
    .innerJoin(assetVersion, eq(reviewTask.assetVersionId, assetVersion.id))
    .innerJoin(asset, eq(assetVersion.assetId, asset.id))
    .where(eq(reviewTask.id, taskId));
  const row = rows[0];
  if (!row) throw new ReviewError(reviewErrorCodes.notFound);
  if (!canApprove && row.submittedBy !== viewerId) {
    throw new ReviewError(reviewErrorCodes.accessDenied);
  }

  const files = await db
    .select({
      filePath: assetFile.filePath,
      fileSize: assetFile.fileSize,
      sha256: assetFile.sha256,
    })
    .from(assetFile)
    .where(eq(assetFile.versionId, row.versionId))
    .orderBy(assetFile.filePath);

  return {
    ...row,
    manifestJson: row.manifestJson as Record<string, unknown> | null,
    files,
  } as ReviewDetailItem;
}

/** 供路由层组合的过滤器校验工具（query 参数解析复用——T7） */
const REVIEW_STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

export function parseReviewStatus(value: string | undefined): ReviewStatus | undefined {
  if (value === undefined || value === '') return undefined;
  return (REVIEW_STATUSES as string[]).includes(value) ? (value as ReviewStatus) : undefined;
}
