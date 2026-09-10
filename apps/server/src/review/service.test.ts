import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { AssetError, assetErrorCodes } from '../assets/errors.js';
import { createAuditWriter } from '../audit/audit.js';
import { createClient, type Db } from '../db/client.js';
import {
  ACCOUNT_ROLE,
  asset,
  assetVersion,
  auditLog,
  reviewTask,
  userAccount,
} from '../db/schema/index.js';
import { ReviewError, reviewErrorCodes } from './errors.js';
import {
  approveReview,
  canSubmitReview,
  canWithdrawReview,
  rejectReview,
  submitVersion,
  withdrawReview,
} from './service.js';

process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'rvw-';
const dbUrl = process.env.DATABASE_URL ?? 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';

let db!: Db;
let audit!: ReturnType<typeof createAuditWriter>;
let ownerId: string; // 资产 owner
let contributorId: string; // 非 owner 上传者（普通用户——无管理档）
let strangerId: string; // 外人

async function makeUser(tag: string): Promise<string> {
  const id = `rvw_${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}

async function insertAsset(slug: string): Promise<number> {
  const [r] = await db
    .insert(asset)
    .values({
      slug: `${PREFIX}${slug}-${randomUUID().slice(0, 8)}`,
      type: 'skill',
      ownerId,
    })
    .returning({ id: asset.id });
  return r!.id;
}

/** 直插版本行（不走上传——submit 服务测状态流转）；返回类型由 returning 推断（八态全） */
async function insertVersion(
  assetId: number,
  version: string,
  status: 'DRAFT' | 'UPLOADED' | 'PUBLISHED' | 'REJECTED',
  createdBy: string,
) {
  const [r] = await db
    .insert(assetVersion)
    .values({ assetId, version, status, createdBy })
    .returning({
      id: assetVersion.id,
      version: assetVersion.version,
      status: assetVersion.status,
      createdBy: assetVersion.createdBy,
    });
  return r!;
}

async function assetRow(assetId: number): Promise<{ id: number; ownerId: string }> {
  const [r] = await db
    .select({ id: asset.id, ownerId: asset.ownerId })
    .from(asset)
    .where(eq(asset.id, assetId));
  return r!;
}

beforeAll(async () => {
  db = createClient(dbUrl);
  await migrate(db, { migrationsFolder: './drizzle' });
  audit = createAuditWriter(db);
  ownerId = await makeUser('owner');
  contributorId = await makeUser('contributor');
  strangerId = await makeUser('stranger');
});

afterAll(async () => {
  // 前缀 like 清理（禁全表 delete）——FK 序：review/version/file → asset → member → ns → audit → user
  await db.delete(reviewTask).where(like(reviewTask.submittedBy, 'rvw_%'));
  await db.delete(assetVersion).where(like(assetVersion.createdBy, 'rvw_%'));
  await db.delete(asset).where(like(asset.ownerId, 'rvw_%'));
  await db.delete(auditLog).where(like(auditLog.actorId, 'rvw_%'));
  await db.delete(userAccount).where(like(userAccount.id, 'rvw_%'));
  await db.$client.end();
});

describe('canSubmitReview（design §3.1 R2 判定——05 §6.4 + 上传者本人例外）', () => {
  it('hasReviewSubmit（管理档 role >= ADMIN）→ 可提', () => {
    expect(
      canSubmitReview({
        assetOwnerId: ownerId,
        versionCreatedBy: contributorId,
        actorId: strangerId,
        hasReviewSubmit: true,
      }),
    ).toBe(true);
  });

  it('上传者本人例外（非 owner 普通用户提自己稿）', () => {
    expect(
      canSubmitReview({
        assetOwnerId: ownerId,
        versionCreatedBy: contributorId,
        actorId: contributorId,
        hasReviewSubmit: false,
      }),
    ).toBe(true);
  });

  it('owner 本人（角色矩阵外业务分支）', () => {
    expect(
      canSubmitReview({
        assetOwnerId: ownerId,
        versionCreatedBy: contributorId,
        actorId: ownerId,
        hasReviewSubmit: false,
      }),
    ).toBe(true);
  });

  it('外人（非上传者非 owner 无权限）→ 拒', () => {
    expect(
      canSubmitReview({
        assetOwnerId: ownerId,
        versionCreatedBy: contributorId,
        actorId: strangerId,
        hasReviewSubmit: false,
      }),
    ).toBe(false);
  });
});

describe('submitVersion（design §3.1 R2）', () => {
  it('DRAFT 提交成功：状态 → PENDING_REVIEW + review_task（version 1）', async () => {
    const assetId = await insertAsset('submit');
    const v = await insertVersion(assetId, '1.0.0', 'DRAFT', contributorId);
    const assetRow_ = await assetRow(assetId);

    const out = await submitVersion(db, audit, {
      asset: assetRow_,
      version: v,
      submitterId: contributorId,
    });
    expect(out.reviewVersion).toBe(1);

    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(eq(assetVersion.id, v.id));
    expect(ver!.status).toBe('PENDING_REVIEW');
    const [task] = await db
      .select({
        status: reviewTask.status,
        version: reviewTask.version,
        submittedBy: reviewTask.submittedBy,
      })
      .from(reviewTask)
      .where(eq(reviewTask.assetVersionId, v.id));
    expect(task).toMatchObject({ status: 'PENDING', version: 1, submittedBy: contributorId });

    // 审计埋点
    const [log] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.actorId, contributorId),
          eq(auditLog.action, 'asset.version_submit'),
          eq(auditLog.targetId, String(assetId)),
        ),
      );
    expect(log?.action).toBe('asset.version_submit');
  });

  it('UPLOADED 前态可提（withdraw 回退态再提——design §3.1）', async () => {
    const assetId = await insertAsset('uploaded');
    const v = await insertVersion(assetId, '2.0.0', 'UPLOADED', ownerId);
    const out = await submitVersion(db, audit, {
      asset: await assetRow(assetId),
      version: v,
      submitterId: ownerId,
    });
    expect(out.reviewVersion).toBe(1);
  });

  it('非前态拒提（PUBLISHED → 400 version_not_submittable）', async () => {
    const assetId = await insertAsset('published');
    const v = await insertVersion(assetId, '3.0.0', 'PUBLISHED', ownerId);
    try {
      await submitVersion(db, audit, {
        asset: await assetRow(assetId),
        version: v,
        submitterId: ownerId,
      });
      throw new Error('expected versionNotSubmittable');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected versionNotSubmittable') throw err;
      expect(err).toBeInstanceOf(AssetError);
      expect((err as AssetError).code).toBe(assetErrorCodes.versionNotSubmittable);
    }
  });

  it('重复提交拒（同版本已 PENDING → 400 review.already_pending）', async () => {
    const assetId = await insertAsset('dup');
    const v = await insertVersion(assetId, '4.0.0', 'DRAFT', contributorId);
    const input = { asset: await assetRow(assetId), version: v, submitterId: contributorId };
    await submitVersion(db, audit, input);
    try {
      await submitVersion(db, audit, input);
      throw new Error('expected alreadyPending');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected alreadyPending') throw err;
      expect(err).toBeInstanceOf(ReviewError);
      expect((err as ReviewError).code).toBe(reviewErrorCodes.alreadyPending);
    }
    // 不落第二行
    const tasks = await db
      .select({ id: reviewTask.id })
      .from(reviewTask)
      .where(eq(reviewTask.assetVersionId, v.id));
    expect(tasks).toHaveLength(1);
  });

  it('review version 重审递增（历史 APPROVED version 1 → 新提交 version 2——08 §6）', async () => {
    const assetId = await insertAsset('rev2');
    const v = await insertVersion(assetId, '5.0.0', 'DRAFT', contributorId);
    // 历史结案任务（version 1，APPROVED——模拟 withdraw 前一轮）
    await db.insert(reviewTask).values({
      assetVersionId: v.id,
      status: 'APPROVED',
      version: 1,
      submittedBy: contributorId,
      reviewedBy: ownerId,
      reviewedAt: new Date(),
    });
    const out = await submitVersion(db, audit, {
      asset: await assetRow(assetId),
      version: v,
      submitterId: contributorId,
    });
    expect(out.reviewVersion).toBe(2);
  });
});

/** 建 DRAFT 版本并提交（返回 {assetId, versionId, taskId}——T4 动作用例共用） */
async function makePendingTask(submitterId: string, versionStr = '1.0.0') {
  const assetId = await insertAsset('pending');
  const v = await insertVersion(assetId, versionStr, 'DRAFT', submitterId);
  const out = await submitVersion(db, audit, {
    asset: await assetRow(assetId),
    version: v,
    submitterId,
  });
  return { assetId, versionId: v.id, taskId: out.taskId };
}

async function taskState(taskId: number) {
  const rows = await db
    .select({
      status: reviewTask.status,
      reviewedBy: reviewTask.reviewedBy,
      version: reviewTask.version,
    })
    .from(reviewTask)
    .where(eq(reviewTask.id, taskId));
  return rows[0];
}

describe('approveReview（design §3.3 R4）', () => {
  it('通过：版本 PUBLISHED + published_at + asset.latest 指向 + task APPROVED + 审计', async () => {
    const { assetId, versionId, taskId } = await makePendingTask(contributorId);
    const out = await approveReview(db, audit, {
      taskId,
      actorId: ownerId,
      comment: 'lgtm',
      canApprove: true,
      isSuperAdmin: false,
    });
    expect(out.publishedVersion).toBe('1.0.0');

    const [ver] = await db
      .select({ status: assetVersion.status, publishedAt: assetVersion.publishedAt })
      .from(assetVersion)
      .where(eq(assetVersion.id, versionId));
    expect(ver!.status).toBe('PUBLISHED');
    expect(ver!.publishedAt).not.toBeNull();
    const [a] = await db
      .select({ latest: asset.latestVersionId })
      .from(asset)
      .where(eq(asset.id, assetId));
    expect(a!.latest).toBe(versionId);
    expect(await taskState(taskId)).toMatchObject({ status: 'APPROVED', reviewedBy: ownerId });

    const [log] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(and(eq(auditLog.action, 'review.approve'), eq(auditLog.targetId, String(taskId))));
    expect(log?.action).toBe('review.approve');
  });

  it('无审核权限（canApprove=false）→ 403 review.access_denied', async () => {
    const { taskId } = await makePendingTask(contributorId);
    try {
      await approveReview(db, audit, {
        taskId,
        actorId: strangerId,
        canApprove: false,
        isSuperAdmin: false,
      });
      throw new Error('expected accessDenied');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected accessDenied') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.accessDenied);
    }
  });

  it('防自审：提交人审自己 → 403 review.self_review；SUPER_ADMIN 例外放行', async () => {
    const { taskId, versionId, assetId } = await makePendingTask(contributorId);
    try {
      await approveReview(db, audit, {
        taskId,
        actorId: contributorId,
        canApprove: true,
        isSuperAdmin: false,
      });
      throw new Error('expected selfReview');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected selfReview') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.selfReview);
    }
    // 版本未被误发布
    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(eq(assetVersion.id, versionId));
    expect(ver!.status).toBe('PENDING_REVIEW');

    // SUPER_ADMIN 例外（05 §6.4：调用方显式放行）
    const out = await approveReview(db, audit, {
      taskId,
      actorId: contributorId,
      comment: 'self',
      canApprove: true,
      isSuperAdmin: true,
    });
    expect(out.publishedVersion).toBe('1.0.0');
    const [a] = await db
      .select({ latest: asset.latestVersionId })
      .from(asset)
      .where(eq(asset.id, assetId));
    expect(a!.latest).toBe(versionId);
  });

  it('并发双审：第一人结案后第二人 → 400 review.not_pending', async () => {
    const { taskId } = await makePendingTask(contributorId);
    await approveReview(db, audit, {
      taskId,
      actorId: ownerId,
      canApprove: true,
      isSuperAdmin: false,
    });
    try {
      await approveReview(db, audit, {
        taskId,
        actorId: ownerId,
        canApprove: true,
        isSuperAdmin: false,
      });
      throw new Error('expected notPending');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected notPending') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.notPending);
    }
  });

  it('task 不存在 → 404 review.not_found', async () => {
    try {
      await approveReview(db, audit, {
        taskId: 999_999_999,
        actorId: ownerId,
        canApprove: true,
        isSuperAdmin: false,
      });
      throw new Error('expected notFound');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected notFound') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.notFound);
    }
  });
});

describe('rejectReview（design §3.4 R5）', () => {
  it('拒绝：版本 REJECTED + task REJECTED + comment 落位；latest 不动（从未发布）', async () => {
    const { assetId, versionId, taskId } = await makePendingTask(contributorId, '2.0.0');
    const out = await rejectReview(db, audit, {
      taskId,
      actorId: ownerId,
      comment: 'missing license',
      canApprove: true,
      isSuperAdmin: false,
    });
    expect(out.rejectedVersion).toBe('2.0.0');

    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(eq(assetVersion.id, versionId));
    expect(ver!.status).toBe('REJECTED');
    const [task] = await db
      .select({ status: reviewTask.status, reviewComment: reviewTask.reviewComment })
      .from(reviewTask)
      .where(eq(reviewTask.id, taskId));
    expect(task).toMatchObject({ status: 'REJECTED', reviewComment: 'missing license' });
    const [a] = await db
      .select({ latest: asset.latestVersionId })
      .from(asset)
      .where(eq(asset.id, assetId));
    expect(a!.latest).toBeNull();

    const [log] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(and(eq(auditLog.action, 'review.reject'), eq(auditLog.targetId, String(taskId))));
    expect(log?.action).toBe('review.reject');
  });

  it('comment 必填（空 → 400 review.comment_required）', async () => {
    const { taskId } = await makePendingTask(contributorId);
    try {
      await rejectReview(db, audit, {
        taskId,
        actorId: ownerId,
        comment: '   ',
        canApprove: true,
        isSuperAdmin: false,
      });
      throw new Error('expected commentRequired');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected commentRequired') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.commentRequired);
    }
  });
});

describe('withdrawReview（design §3.5 R6——PENDING_REVIEW → UPLOADED + 删 PENDING 任务）', () => {
  it('提交人本人撤回：版本 UPLOADED + task 行保留置 WITHDRAWN（历史留档——08 §6 version 递增）', async () => {
    const { assetId, versionId, taskId } = await makePendingTask(contributorId, '3.0.0');
    await withdrawReview(db, audit, {
      taskId,
      actorId: contributorId,
      viewerRole: ACCOUNT_ROLE.USER,
    });
    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(eq(assetVersion.id, versionId));
    expect(ver!.status).toBe('UPLOADED');
    const [task] = await db
      .select({ status: reviewTask.status })
      .from(reviewTask)
      .where(eq(reviewTask.id, taskId));
    expect(task?.status).toBe('WITHDRAWN'); // 保留行（不删——历史留档）
    // withdraw 回 UPLOADED 后可再提——review version 递增（历史 WITHDRAWN max=1 → 2，08 §6）
    const [v] = await db
      .select({
        id: assetVersion.id,
        version: assetVersion.version,
        status: assetVersion.status,
        createdBy: assetVersion.createdBy,
      })
      .from(assetVersion)
      .where(eq(assetVersion.id, versionId));
    const out = await submitVersion(db, audit, {
      asset: await assetRow(assetId),
      version: v!,
      submitterId: contributorId,
    });
    expect(out.reviewVersion).toBe(2);
  });

  it('owner 可撤他人提交（管理面）', async () => {
    const { versionId, taskId } = await makePendingTask(contributorId, '4.0.0');
    await withdrawReview(db, audit, {
      taskId,
      actorId: ownerId,
      viewerRole: ACCOUNT_ROLE.USER,
    });
    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(eq(assetVersion.id, versionId));
    expect(ver!.status).toBe('UPLOADED');
  });

  it('外人（非提交人非 owner 无管理档）→ 403 review.access_denied', async () => {
    const { taskId, versionId } = await makePendingTask(contributorId, '5.0.0');
    try {
      await withdrawReview(db, audit, {
        taskId,
        actorId: strangerId,
        viewerRole: ACCOUNT_ROLE.USER,
      });
      throw new Error('expected accessDenied');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected accessDenied') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.accessDenied);
    }
    const [ver] = await db
      .select({ status: assetVersion.status })
      .from(assetVersion)
      .where(eq(assetVersion.id, versionId));
    expect(ver!.status).toBe('PENDING_REVIEW'); // 状态未被破坏
  });

  it('已结案 task 撤回 → 400 review.not_pending', async () => {
    const { taskId } = await makePendingTask(contributorId, '6.0.0');
    await approveReview(db, audit, {
      taskId,
      actorId: ownerId,
      canApprove: true,
      isSuperAdmin: false,
    });
    try {
      await withdrawReview(db, audit, {
        taskId,
        actorId: contributorId,
        viewerRole: ACCOUNT_ROLE.USER,
      });
      throw new Error('expected notPending');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected notPending') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.notPending);
    }
  });
});

describe('canWithdrawReview（design §3.5 R6 判定）', () => {
  it('矩阵：提交人/owner/管理档/SUPER_ADMIN 可撤；外人拒', () => {
    const base = {
      submittedBy: contributorId,
      assetOwnerId: ownerId,
      actorId: contributorId,
      viewerRole: ACCOUNT_ROLE.USER,
    };
    expect(canWithdrawReview(base)).toBe(true); // 提交人本人
    expect(canWithdrawReview({ ...base, actorId: ownerId })).toBe(true); // owner
    expect(
      canWithdrawReview({ ...base, actorId: strangerId, viewerRole: ACCOUNT_ROLE.ADMIN }),
    ).toBe(true); // 管理档
    expect(canWithdrawReview({ ...base, actorId: strangerId })).toBe(false); // 外人
    expect(
      canWithdrawReview({ ...base, actorId: contributorId, viewerRole: ACCOUNT_ROLE.SUPER_ADMIN }),
    ).toBe(true); // 超管
  });
});
