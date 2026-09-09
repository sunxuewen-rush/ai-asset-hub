import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createClient, type Db } from '../db/client.js';
import {
  asset,
  assetFile,
  assetVersion,
  namespace,
  namespaceMember,
  reviewTask,
  userAccount,
} from '../db/schema/index.js';
import { type ReviewError, reviewErrorCodes } from './errors.js';
import { getReviewDetail, listMine, listQueue } from './query.js';

process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'qr-';
const dbUrl = process.env.DATABASE_URL ?? 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';

let db!: Db;
let nsId: number;
let ownerId: string; // ns OWNER（审核面）
let contributorId: string; // 提交人（MEMBER）
let adminId: string; // 空间 ADMIN（审核面）
let strangerId: string; // ns 外用户（无审核面）
let assetId: number;

async function makeUser(tag: string): Promise<string> {
  const id = `${PREFIX}${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}

/** 直插版本 + review task（status 映射：task 状态 → 版本状态） */
async function insertTaskWithVersion(
  taskStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN',
  versionNumber: string,
  submittedBy: string,
  reviewedBy?: string,
): Promise<number> {
  const versionStatus =
    taskStatus === 'APPROVED'
      ? 'PUBLISHED'
      : taskStatus === 'REJECTED'
        ? 'REJECTED'
        : taskStatus === 'WITHDRAWN'
          ? 'UPLOADED'
          : 'PENDING_REVIEW';
  const [v] = await db
    .insert(assetVersion)
    .values({
      assetId,
      version: versionNumber,
      status: versionStatus,
      createdBy: contributorId,
      manifestJson: { name: `demo-${versionNumber}` },
    })
    .returning({ id: assetVersion.id });
  const [t] = await db
    .insert(reviewTask)
    .values({
      assetVersionId: v!.id,
      namespaceId: nsId,
      status: taskStatus,
      version: 1,
      submittedBy,
      reviewedBy: reviewedBy ?? (taskStatus === 'PENDING' ? null : ownerId),
      reviewedAt: taskStatus === 'PENDING' ? null : new Date(),
    })
    .returning({ id: reviewTask.id });
  return t!.id;
}

beforeAll(async () => {
  db = createClient(dbUrl);
  await migrate(db, { migrationsFolder: './drizzle' });
  ownerId = await makeUser('owner');
  contributorId = await makeUser('contributor');
  adminId = await makeUser('admin');
  strangerId = await makeUser('stranger');
  const [ns] = await db
    .insert(namespace)
    .values({
      slug: `${PREFIX}ns-${randomUUID().slice(0, 8)}`,
      displayName: `${PREFIX}ns`,
      type: 'TEAM',
      createdBy: ownerId,
    })
    .returning({ id: namespace.id });
  nsId = ns!.id;
  await db.insert(namespaceMember).values([
    { namespaceId: nsId, userId: ownerId, role: 'OWNER' },
    { namespaceId: nsId, userId: contributorId, role: 'MEMBER' },
    { namespaceId: nsId, userId: adminId, role: 'ADMIN' },
  ]);
  const [a] = await db
    .insert(asset)
    .values({ namespaceId: nsId, slug: `${PREFIX}demo`, type: 'skill', ownerId })
    .returning({ id: asset.id });
  assetId = a!.id;
});

afterAll(async () => {
  // 链序清理：file → review_task → version → asset → member/ns/audit/user
  const versionIds = (
    await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(eq(assetVersion.assetId, assetId))
  ).map((v) => v.id);
  if (versionIds.length > 0) {
    await db.delete(assetFile).where(inArray(assetFile.versionId, versionIds));
  }
  await db.delete(reviewTask).where(eq(reviewTask.namespaceId, nsId));
  await db.delete(assetVersion).where(eq(assetVersion.assetId, assetId));
  await db.delete(asset).where(eq(asset.id, assetId));
  await db.delete(namespaceMember).where(like(namespaceMember.userId, `${PREFIX}%`));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  await db.delete(userAccount).where(like(userAccount.id, `${PREFIX}%`));
  await db.$client.end();
});

describe('review 队列/我的/详情读面（design §3.7 R8）', () => {
  let pendingTaskId: number;
  let approvedTaskId: number;
  let rejectedTaskId: number;
  let withdrawnTaskId: number;

  beforeAll(async () => {
    pendingTaskId = await insertTaskWithVersion('PENDING', '1.0.0', contributorId);
    approvedTaskId = await insertTaskWithVersion('APPROVED', '2.0.0', contributorId);
    rejectedTaskId = await insertTaskWithVersion('REJECTED', '3.0.0', contributorId);
    withdrawnTaskId = await insertTaskWithVersion('WITHDRAWN', '4.0.0', ownerId);
  });

  it('审核队列（空间 ADMIN 面 + namespaceId）：本空间全 task 四态可见', async () => {
    const { items, total } = await listQueue(db, { namespaceId: nsId, limit: 50, offset: 0 });
    expect(total).toBe(4);
    const statuses = items.map((i) => i.status).sort();
    expect(statuses).toEqual(['APPROVED', 'PENDING', 'REJECTED', 'WITHDRAWN']);
    const first = items[0]!;
    expect(first.namespaceSlug).toContain(PREFIX);
    expect(first.assetSlug).toBe(`${PREFIX}demo`);
  });

  it('审核队列 status 过滤（PENDING only）', async () => {
    const { items, total } = await listQueue(db, {
      namespaceId: nsId,
      status: 'PENDING',
      limit: 50,
      offset: 0,
    });
    expect(total).toBe(1);
    expect(items[0]!.taskId).toBe(pendingTaskId);
  });

  it('我的提交（contributor）：本人提交可见、他人提交（owner 的 WITHDRAWN）不可见', async () => {
    const { items, total } = await listMine(db, contributorId, { limit: 50, offset: 0 });
    expect(total).toBe(3); // 1.0.0/2.0.0/3.0.0 由 contributor 提交；4.0.0 owner 提交
    expect(items.every((i) => i.submittedBy === contributorId)).toBe(true);
  });

  it('详情：审核面可读（含 manifest + 文件清单 sha256）', async () => {
    // 给 pending 版本挂 file 行（内容级审核预览断言）——按 assetId 精确定位（禁裸 version 查询）
    const [vRow] = await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, assetId), eq(assetVersion.version, '1.0.0')));
    await db.insert(assetFile).values({
      versionId: vRow!.id,
      filePath: 'SKILL.md',
      fileSize: 64,
      sha256: 'a'.repeat(64),
      storageKey: `qr/${assetId}/1.0.0/SKILL.md`,
    });
    const detail = await getReviewDetail(db, {
      taskId: pendingTaskId,
      viewerId: adminId,
      canApprove: true,
    });
    expect(detail.manifestJson).toMatchObject({ name: 'demo-1.0.0' });
    expect(detail.files).toHaveLength(1);
    expect(detail.files[0]!.sha256).toBe('a'.repeat(64));
    expect(detail.versionStatus).toBe('PENDING_REVIEW');
  });

  it('详情：提交人本人可读（owner 代提的 WITHDRAWN——本人面）', async () => {
    const detail = await getReviewDetail(db, {
      taskId: withdrawnTaskId,
      viewerId: ownerId,
      canApprove: false,
    });
    expect(detail.status).toBe('WITHDRAWN');
  });

  it('详情：外人（非提交人非审核面）→ 403 review.access_denied', async () => {
    try {
      await getReviewDetail(db, { taskId: pendingTaskId, viewerId: strangerId, canApprove: false });
      throw new Error('expected accessDenied');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected accessDenied') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.accessDenied);
    }
  });

  it('详情：task 不存在 → 404 review.not_found', async () => {
    try {
      await getReviewDetail(db, { taskId: 999_999_999, viewerId: ownerId, canApprove: true });
      throw new Error('expected notFound');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected notFound') throw err;
      expect((err as ReviewError).code).toBe(reviewErrorCodes.notFound);
    }
  });
});
