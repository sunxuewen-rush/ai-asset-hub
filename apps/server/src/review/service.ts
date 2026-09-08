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
import { assetVersion, reviewTask, type VersionStatus } from '../db/schema/index.js';
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
