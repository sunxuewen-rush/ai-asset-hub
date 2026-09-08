import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createAuditWriter } from '../audit/audit.js';
import { createClient, type Db } from '../db/client.js';
import {
  asset,
  assetVersion,
  auditLog,
  namespace,
  namespaceMember,
  reviewTask,
  userAccount,
} from '../db/schema/index.js';
import { AssetError, assetErrorCodes } from '../assets/errors.js';
import { ReviewError, reviewErrorCodes } from './errors.js';
import { canSubmitReview, submitVersion } from './service.js';

process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'rvw-';
const dbUrl = process.env.DATABASE_URL ?? 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';

let db!: Db;
let audit!: ReturnType<typeof createAuditWriter>;
let nsId: number;
let ownerId: string; // 资产 owner（ns OWNER 成员）
let contributorId: string; // 非 owner 上传者（ns MEMBER——无 review:submit 权限面）
let strangerId: string; // ns 外成员

async function makeUser(tag: string): Promise<string> {
  const id = `rvw_${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}

async function insertNs(): Promise<number> {
  const [r] = await db
    .insert(namespace)
    .values({ slug: `${PREFIX}ns-${randomUUID().slice(0, 8)}`, displayName: `${PREFIX}ns`, type: 'TEAM', createdBy: ownerId })
    .returning({ id: namespace.id });
  return r!.id;
}

async function insertAsset(slug: string): Promise<number> {
  const [r] = await db
    .insert(asset)
    .values({ namespaceId: nsId, slug: `${PREFIX}${slug}-${randomUUID().slice(0, 8)}`, type: 'skill', ownerId })
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
    .returning({ id: assetVersion.id, version: assetVersion.version, status: assetVersion.status, createdBy: assetVersion.createdBy });
  return r!;
}

async function assetRow(assetId: number): Promise<{ id: number; namespaceId: number; ownerId: string }> {
  const [r] = await db
    .select({ id: asset.id, namespaceId: asset.namespaceId, ownerId: asset.ownerId })
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
  nsId = await insertNs();
  await db.insert(namespaceMember).values([
    { namespaceId: nsId, userId: ownerId, role: 'OWNER' },
    { namespaceId: nsId, userId: contributorId, role: 'MEMBER' },
  ]);
});

afterAll(async () => {
  // 前缀 like 清理（禁全表 delete）——FK 序：review/version/file → asset → member → ns → audit → user
  await db.delete(reviewTask).where(like(reviewTask.submittedBy, 'rvw_%'));
  await db.delete(assetVersion).where(like(assetVersion.createdBy, 'rvw_%'));
  await db.delete(asset).where(like(asset.ownerId, 'rvw_%'));
  await db.delete(namespaceMember).where(like(namespaceMember.userId, 'rvw_%'));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, 'rvw_%'));
  await db.delete(userAccount).where(like(userAccount.id, 'rvw_%'));
  await db.$client.end();
});

describe('canSubmitReview（design §3.1 R2 判定——05 §6.4 + 上传者本人例外）', () => {
  it('hasReviewSubmit（空间 ADMIN/OWNER + ASSET_ADMIN + SUPER_ADMIN——can() 结果）→ 可提', () => {
    expect(canSubmitReview({ assetOwnerId: ownerId, versionCreatedBy: contributorId, actorId: strangerId, hasReviewSubmit: true })).toBe(true);
  });

  it('上传者本人例外（非 owner 非权限——MEMBER 贡献者提自己稿）', () => {
    expect(canSubmitReview({ assetOwnerId: ownerId, versionCreatedBy: contributorId, actorId: contributorId, hasReviewSubmit: false })).toBe(true);
  });

  it('owner 本人（角色矩阵外业务分支）', () => {
    expect(canSubmitReview({ assetOwnerId: ownerId, versionCreatedBy: contributorId, actorId: ownerId, hasReviewSubmit: false })).toBe(true);
  });

  it('外人（非上传者非 owner 无权限）→ 拒', () => {
    expect(canSubmitReview({ assetOwnerId: ownerId, versionCreatedBy: contributorId, actorId: strangerId, hasReviewSubmit: false })).toBe(false);
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

    const [ver] = await db.select({ status: assetVersion.status }).from(assetVersion).where(eq(assetVersion.id, v.id));
    expect(ver!.status).toBe('PENDING_REVIEW');
    const [task] = await db
      .select({ status: reviewTask.status, version: reviewTask.version, submittedBy: reviewTask.submittedBy })
      .from(reviewTask)
      .where(eq(reviewTask.assetVersionId, v.id));
    expect(task).toMatchObject({ status: 'PENDING', version: 1, submittedBy: contributorId });

    // 审计埋点
    const [log] = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(and(eq(auditLog.actorId, contributorId), eq(auditLog.action, 'asset.version_submit'), eq(auditLog.targetId, String(assetId))));
    expect(log?.action).toBe('asset.version_submit');
  });

  it('UPLOADED 前态可提（withdraw 回退态再提——design §3.1）', async () => {
    const assetId = await insertAsset('uploaded');
    const v = await insertVersion(assetId, '2.0.0', 'UPLOADED', ownerId);
    const out = await submitVersion(db, audit, { asset: await assetRow(assetId), version: v, submitterId: ownerId });
    expect(out.reviewVersion).toBe(1);
  });

  it('非前态拒提（PUBLISHED → 400 version_not_submittable）', async () => {
    const assetId = await insertAsset('published');
    const v = await insertVersion(assetId, '3.0.0', 'PUBLISHED', ownerId);
    try {
      await submitVersion(db, audit, { asset: await assetRow(assetId), version: v, submitterId: ownerId });
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
    const tasks = await db.select({ id: reviewTask.id }).from(reviewTask).where(eq(reviewTask.assetVersionId, v.id));
    expect(tasks).toHaveLength(1);
  });

  it('review version 重审递增（历史 APPROVED version 1 → 新提交 version 2——08 §6）', async () => {
    const assetId = await insertAsset('rev2');
    const v = await insertVersion(assetId, '5.0.0', 'DRAFT', contributorId);
    // 历史结案任务（version 1，APPROVED——模拟 withdraw 前一轮）
    await db.insert(reviewTask).values({
      assetVersionId: v.id,
      namespaceId: nsId,
      status: 'APPROVED',
      version: 1,
      submittedBy: contributorId,
      reviewedBy: ownerId,
      reviewedAt: new Date(),
    });
    const out = await submitVersion(db, audit, { asset: await assetRow(assetId), version: v, submitterId: contributorId });
    expect(out.reviewVersion).toBe(2);
  });
});
