/**
 * review 域服务：submit（M3 design §3.1 R2——显式提交审核）。
 * 判定模型（canSubmitReview 纯函数——路由层组装输入，canManageAsset 先例）：
 *   hasReviewSubmit（= can('review:submit', nsId)——空间 ADMIN/OWNER（NS_ROLE 映射）+
 *   ASSET_ADMIN（平台 permission）+ SUPER_ADMIN（短路），FROZEN/ARCHIVED 拒写已含）
 *   ∪ 版本上传者本人（开放协作例外——05 §6.4 收尾同步项，R2 拍板）
 *   ∪ 资产 owner 本人（05 §6.4 review:submit 行——owner 判定不进角色矩阵，业务组合）。
 * approve/reject/withdraw 在 T4（design §3.3-§3.5）；读面 T5/T6。
 */
import { and, eq, max } from 'drizzle-orm';
import type { AuditWriter } from '../audit/audit.js';
import type { Db } from '../db/client.js';
import { asset, assetVersion, reviewTask, type NamespaceRole, type VersionStatus } from '../db/schema/index.js';
import { isSelfReview } from '../auth/rbac.js';
import { AssetError, assetErrorCodes } from '../assets/errors.js';
import { ReviewError, reviewErrorCodes } from './errors.js';

export interface CanSubmitInput {
  /** 资产 owner（05 §6.4「owner 本人」判定——角色矩阵外的业务分支） */
  assetOwnerId: string;
  /** 版本上传者（created_by——开放协作例外对象） */
  versionCreatedBy: string | null;
  actorId: string;
  /** 路由层判定：can('review:submit', namespaceId)（SUPER_ADMIN 短路已含） */
  hasReviewSubmit: boolean;
}

/** 提交提审判定（05 §6.4 + R2 上传者本人例外——防自审不在此（那是审核面 T4）） */
export function canSubmitReview(input: CanSubmitInput): boolean {
  if (input.hasReviewSubmit) return true;
  if (input.actorId === input.versionCreatedBy) return true; // 上传者本人例外（R2）
  return input.actorId === input.assetOwnerId; // owner 本人
}

export interface SubmitVersionInput {
  asset: { id: number; namespaceId: number; ownerId: string };
  version: { id: number; version: string; status: VersionStatus; createdBy: string | null };
  submitterId: string;
}

export interface SubmittedReview {
  taskId: number;
  reviewVersion: number;
}

const SUBMITTABLE: ReadonlySet<VersionStatus> = new Set(['DRAFT', 'UPLOADED']);

/**
 * 提交审核：DRAFT/UPLOADED → PENDING_REVIEW + 建 review_task（design §3.1 R2）。
 * 单事务（版本状态 + task 行）；PENDING 部分唯一索引（08 §6）防并发双待审——预检
 * already_pending + 23505 兜底；review version = 该版本历史 task 最大 + 1（08 §6 重审语义）。
 * 权限判定在路由层完成（canSubmitReview）——本服务收授权后输入。
 */
export async function submitVersion(
  db: Db,
  audit: AuditWriter,
  input: SubmitVersionInput,
): Promise<SubmittedReview> {
  const { asset: target, version, submitterId } = input;

  // 前态校验（design §3.1：仅 DRAFT/UPLOADED——skillhub submit 前态同构）
  if (!SUBMITTABLE.has(version.status)) {
    throw new AssetError(assetErrorCodes.versionNotSubmittable);
  }

  try {
    const task = await db.transaction(async (tx) => {
      // 同版本已 PENDING 预检（友好码；并发兜底在 23505）
      const pending = await tx
        .select({ id: reviewTask.id })
        .from(reviewTask)
        .where(
          and(
            eq(reviewTask.assetVersionId, version.id),
            eq(reviewTask.status, 'PENDING'),
          ),
        );
      if (pending.length > 0) throw new ReviewError(reviewErrorCodes.alreadyPending);

      // review version 重审递增（08 §6：该版本历史 task 最大 version + 1，首次 = 1）
      const [agg] = await tx
        .select({ maxVersion: max(reviewTask.version) })
        .from(reviewTask)
        .where(eq(reviewTask.assetVersionId, version.id));
      const reviewVersion = Number(agg?.maxVersion ?? 0) + 1;

      const [taskRow] = await tx
        .insert(reviewTask)
        .values({
          assetVersionId: version.id,
          namespaceId: target.namespaceId,
          status: 'PENDING',
          version: reviewVersion,
          submittedBy: submitterId,
        })
        .returning({ id: reviewTask.id });

      await tx
        .update(assetVersion)
        .set({ status: 'PENDING_REVIEW' })
        .where(eq(assetVersion.id, version.id));

      return { id: taskRow!.id, reviewVersion };
    });

    await audit({
      actorId: submitterId,
      action: 'asset.version_submit',
      targetType: 'asset',
      targetId: String(target.id),
      detail: { version: version.version, reviewVersion: task.reviewVersion },
    });

    return { taskId: task.id, reviewVersion: task.reviewVersion };
  } catch (err) {
    // 并发双提交兜底：部分唯一索引 uq_review_task_version_pending（08 §6 DB 硬约束）
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === '23505') throw new ReviewError(reviewErrorCodes.alreadyPending);
    throw err;
  }
}

/* ==================== 审核动作（design §3.3-§3.5 R4/R6，T4） ==================== */

export interface ReviewActionInput {
  taskId: number;
  actorId: string;
  comment?: string;
  /** 路由层判定：can('review:approve', nsId)——空间 ADMIN/OWNER + ASSET_ADMIN + SUPER_ADMIN（05 §6.4） */
  canApprove: boolean;
  /** 防自审例外（05 §6.4：SUPER_ADMIN 可审自己的提交——调用方显式放行） */
  isSuperAdmin: boolean;
}

/** 审核任务行读面（approve/reject 共用） */
interface TaskWithVersion {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedBy: string;
  versionId: number;
  versionNumber: string;
  assetId: number;
}

async function loadPendingTask(db: Db, taskId: number): Promise<TaskWithVersion> {
  const rows = await db
    .select({
      id: reviewTask.id,
      status: reviewTask.status,
      submittedBy: reviewTask.submittedBy,
      versionId: reviewTask.assetVersionId,
      versionNumber: assetVersion.version,
      assetId: assetVersion.assetId,
    })
    .from(reviewTask)
    .innerJoin(assetVersion, eq(reviewTask.assetVersionId, assetVersion.id))
    .where(eq(reviewTask.id, taskId));
  const row = rows[0];
  if (!row) throw new ReviewError(reviewErrorCodes.notFound);
  return row as TaskWithVersion;
}

/**
 * 审核通过：PENDING_REVIEW → PUBLISHED（design §3.3 R4）。
 * 单事务：条件更新 review_task（并发双审——0 行即 not_pending）→ 版本 PUBLISHED + published_at →
 * asset.latest_version_id 指向该版本（skillhub 14 §4.2 同构——发布时序即最新）。
 * 防自审：isSelfReview(submittedBy, reviewerId)——403 review.self_review。
 */
export async function approveReview(
  db: Db,
  audit: AuditWriter,
  input: ReviewActionInput,
): Promise<{ taskId: number; publishedVersion: string }> {
  const { taskId, actorId, comment, canApprove, isSuperAdmin } = input;
  if (!canApprove) throw new ReviewError(reviewErrorCodes.accessDenied);

  const task = await loadPendingTask(db, taskId);
  // 防自审（05 §6.4：审核人不得是提交人——SUPER_ADMIN 例外由 isSuperAdmin 放行）
  if (isSelfReview(task.submittedBy, actorId, isSuperAdmin)) {
    throw new ReviewError(reviewErrorCodes.selfReview);
  }

  await db.transaction(async (tx) => {
    // 条件更新：仅 PENDING 可结案——并发双审第二人 0 行 → not_pending
    const updated = await tx
      .update(reviewTask)
      .set({
        status: 'APPROVED',
        reviewedBy: actorId,
        reviewComment: comment?.trim() ? comment.trim() : null,
        reviewedAt: new Date(),
      })
      .where(and(eq(reviewTask.id, taskId), eq(reviewTask.status, 'PENDING')))
      .returning({ id: reviewTask.id });
    if (updated.length === 0) throw new ReviewError(reviewErrorCodes.notPending);

    await tx
      .update(assetVersion)
      .set({ status: 'PUBLISHED', publishedAt: new Date() })
      .where(eq(assetVersion.id, task.versionId));

    // latest 指针：发布时序即最新（yank 时重算——T8）
    // updatedAt 同步 bump：资产活跃序（T12 搜索排序 updated_at desc——发布=内容更新核心）
    await tx
      .update(asset)
      .set({ latestVersionId: task.versionId, updatedAt: new Date() })
      .where(eq(asset.id, task.assetId));
  });

  await audit({
    actorId,
    action: 'review.approve',
    targetType: 'review_task',
    targetId: String(taskId),
    detail: { version: task.versionNumber },
  });
  return { taskId, publishedVersion: task.versionNumber };
}

/**
 * 审核拒绝：PENDING_REVIEW → REJECTED（design §3.4 R5——版本留档可查）。
 * comment 必填（skillhub RejectReviewRequest 同构——拒绝须给理由）；latest 指针不动
 * （版本从未 PUBLISHED）。
 */
export async function rejectReview(
  db: Db,
  audit: AuditWriter,
  input: ReviewActionInput,
): Promise<{ taskId: number; rejectedVersion: string }> {
  const { taskId, actorId, comment, canApprove, isSuperAdmin } = input;
  if (!canApprove) throw new ReviewError(reviewErrorCodes.accessDenied);
  if (!comment?.trim()) throw new ReviewError(reviewErrorCodes.commentRequired);

  const task = await loadPendingTask(db, taskId);
  if (isSelfReview(task.submittedBy, actorId, isSuperAdmin)) {
    throw new ReviewError(reviewErrorCodes.selfReview);
  }

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(reviewTask)
      .set({
        status: 'REJECTED',
        reviewedBy: actorId,
        reviewComment: comment.trim(),
        reviewedAt: new Date(),
      })
      .where(and(eq(reviewTask.id, taskId), eq(reviewTask.status, 'PENDING')))
      .returning({ id: reviewTask.id });
    if (updated.length === 0) throw new ReviewError(reviewErrorCodes.notPending);

    await tx
      .update(assetVersion)
      .set({ status: 'REJECTED' })
      .where(eq(assetVersion.id, task.versionId));
  });

  await audit({
    actorId,
    action: 'review.reject',
    targetType: 'review_task',
    targetId: String(taskId),
    detail: { version: task.versionNumber },
  });
  return { taskId, rejectedVersion: task.versionNumber };
}

export interface CanWithdrawInput {
  /** review_task.submitted_by（提交人本人——skillhub withdraw-review 同构） */
  submittedBy: string;
  /** 资产 owner（05 §6.4 owner 业务分支） */
  assetOwnerId: string;
  actorId: string;
  /** viewer 在空间的角色（路由层查） */
  namespaceRole: NamespaceRole | null;
  isSuperAdmin: boolean;
}

/** 撤回提审判定（design §3.5 R6：提交人本人 / asset owner / 空间 ADMIN/OWNER / SUPER_ADMIN） */
export function canWithdrawReview(input: CanWithdrawInput): boolean {
  if (input.isSuperAdmin) return true;
  if (input.actorId === input.submittedBy) return true;
  if (input.actorId === input.assetOwnerId) return true;
  return input.namespaceRole === 'OWNER' || input.namespaceRole === 'ADMIN';
}

/**
 * 撤回提审：PENDING_REVIEW → UPLOADED + 删 PENDING task 行（design §3.5 R6；
 * skillhub 代码实证——withdraw 回 UPLOADED 非文档写的 DRAFT）。
 * 判定收服务内（task → version → asset ownerId 链路），路由层传 nsRole/isSuperAdmin。
 */
export async function withdrawReview(
  db: Db,
  audit: AuditWriter,
  input: { taskId: number; actorId: string; namespaceRole: NamespaceRole | null; isSuperAdmin: boolean },
): Promise<void> {
  const { taskId, actorId, namespaceRole, isSuperAdmin } = input;
  const task = await loadPendingTask(db, taskId);
  if (task.status !== 'PENDING') throw new ReviewError(reviewErrorCodes.notPending);

  const [ownerRow] = await db
    .select({ ownerId: asset.ownerId })
    .from(asset)
    .innerJoin(assetVersion, eq(asset.id, assetVersion.assetId))
    .where(eq(assetVersion.id, task.versionId));
  const canWithdraw = canWithdrawReview({
    submittedBy: task.submittedBy,
    assetOwnerId: ownerRow?.ownerId ?? '',
    actorId,
    namespaceRole,
    isSuperAdmin,
  });
  if (!canWithdraw) throw new ReviewError(reviewErrorCodes.accessDenied);

  await db.transaction(async (tx) => {
    // 保留行置 WITHDRAWN（不删行——08 §6 review version 递增依赖历史行 max；
    // 被撤提审留档可查；部分唯一索引仍只锁 PENDING——防并发双待审不变）
    const updated = await tx
      .update(reviewTask)
      .set({ status: 'WITHDRAWN' })
      .where(and(eq(reviewTask.id, taskId), eq(reviewTask.status, 'PENDING')))
      .returning({ id: reviewTask.id });
    if (updated.length === 0) throw new ReviewError(reviewErrorCodes.notPending);

    await tx
      .update(assetVersion)
      .set({ status: 'UPLOADED' })
      .where(eq(assetVersion.id, task.versionId));
  });

  await audit({
    actorId,
    action: 'review.withdraw',
    targetType: 'review_task',
    targetId: String(taskId),
    detail: { version: task.versionNumber },
  });
}
