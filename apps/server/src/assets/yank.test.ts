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
  userAccount,
} from '../db/schema/index.js';
import { AssetError, assetErrorCodes } from './errors.js';
import { canYank, yankVersion } from './yank.js';

process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'ynk-';
const dbUrl = process.env.DATABASE_URL ?? 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';

let db!: Db;
let audit!: ReturnType<typeof createAuditWriter>;
let nsId: number;
let ownerId: string;

async function makeUser(tag: string): Promise<string> {
  const id = `${PREFIX}${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}

/** 建资产 + 指定版本（returning full row）——yank 服务测试直插 PUBLISHED */
async function insertAssetAndVersion(
  version: string,
  status: 'PUBLISHED' | 'YANKED' | 'PENDING_REVIEW' | 'REJECTED' | 'DRAFT',
  publishedAt?: Date,
) {
  const [a] = await db
    .insert(asset)
    .values({ namespaceId: nsId, slug: `${PREFIX}a-${randomUUID().slice(0, 8)}`, type: 'skill', ownerId })
    .returning({ id: asset.id });
  const [v] = await db
    .insert(assetVersion)
    .values({ assetId: a!.id, version, status, createdBy: ownerId, publishedAt: publishedAt ?? new Date() })
    .returning({ id: assetVersion.id, version: assetVersion.version, status: assetVersion.status });
  return { assetId: a!.id, versionRow: v! };
}

beforeAll(async () => {
  db = createClient(dbUrl);
  await migrate(db, { migrationsFolder: './drizzle' });
  audit = createAuditWriter(db);
  ownerId = await makeUser('owner');
  const [ns] = await db
    .insert(namespace)
    .values({ slug: `${PREFIX}ns-${randomUUID().slice(0, 8)}`, displayName: `${PREFIX}ns`, type: 'TEAM', createdBy: ownerId })
    .returning({ id: namespace.id });
  nsId = ns!.id;
  await db.insert(namespaceMember).values({ namespaceId: nsId, userId: ownerId, role: 'OWNER' });
});

afterAll(async () => {
  // 链序：version → asset → member → ns → audit → user
  await db.delete(assetVersion).where(like(assetVersion.createdBy, `${PREFIX}%`));
  await db.delete(asset).where(like(asset.ownerId, `${PREFIX}%`));
  await db.delete(namespaceMember).where(like(namespaceMember.userId, `${PREFIX}%`));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `${PREFIX}%`));
  await db.delete(userAccount).where(like(userAccount.id, `${PREFIX}%`));
  await db.$client.end();
});

describe('canYank（design §4.1 R9——仅平台治理面）', () => {
  it('矩阵：ASSET_ADMIN/SUPER_ADMIN 可 yank；owner/空间 ADMIN 不可', () => {
    expect(canYank(true, false)).toBe(true); // ASSET_ADMIN
    expect(canYank(false, true)).toBe(true); // SUPER_ADMIN
    expect(canYank(false, false)).toBe(false); // owner/空间 ADMIN/MEMBER——治理最严面
  });
});

describe('yankVersion（design §4.1 R9——PUBLISHED → YANKED + latest 重算）', () => {
  it('单 PUBLISHED 版本 yank：三列留痕 + latest 置 null + 审计', async () => {
    const { assetId, versionRow } = await insertAssetAndVersion('1.0.0', 'PUBLISHED');
    await db.update(asset).set({ latestVersionId: versionRow.id }).where(eq(asset.id, assetId));

    const out = await yankVersion(db, audit, { assetId, version: versionRow, actorId: ownerId, reason: 'security incident' });
    expect(out.latestVersionId).toBeNull();

    const [ver] = await db
      .select({ status: assetVersion.status, yankedAt: assetVersion.yankedAt, yankedBy: assetVersion.yankedBy, yankReason: assetVersion.yankReason })
      .from(assetVersion)
      .where(eq(assetVersion.id, versionRow.id));
    expect(ver).toMatchObject({ status: 'YANKED', yankedBy: ownerId, yankReason: 'security incident' });
    expect(ver!.yankedAt).not.toBeNull();
    const [a] = await db.select({ latest: asset.latestVersionId }).from(asset).where(eq(asset.id, assetId));
    expect(a!.latest).toBeNull();

    const [log] = await db.select({ action: auditLog.action }).from(auditLog)
      .where(and(eq(auditLog.action, 'asset.version_yank'), eq(auditLog.targetId, String(assetId))));
    expect(log?.action).toBe('asset.version_yank');
  });

  it('多 PUBLISHED：yank 当前 latest → 指回剩余最新（publishedAt 序）', async () => {
    const [a] = await db
      .insert(asset)
      .values({ namespaceId: nsId, slug: `${PREFIX}m-${randomUUID().slice(0, 8)}`, type: 'skill', ownerId })
      .returning({ id: asset.id });
    const assetId = a!.id;
    const early = new Date(Date.now() - 3600_000);
    const [v1] = await db.insert(assetVersion).values({ assetId, version: '1.0.0', status: 'PUBLISHED', createdBy: ownerId, publishedAt: early }).returning({ id: assetVersion.id });
    const [v2] = await db.insert(assetVersion).values({ assetId, version: '2.0.0', status: 'PUBLISHED', createdBy: ownerId, publishedAt: new Date() }).returning({ id: assetVersion.id, version: assetVersion.version, status: assetVersion.status });
    await db.update(asset).set({ latestVersionId: v2!.id }).where(eq(asset.id, assetId));

    const out = await yankVersion(db, audit, { assetId, version: v2!, actorId: ownerId, reason: 'bad release' });
    expect(out.latestVersionId).toBe(v1!.id); // 指回 1.0.0（剩余最新 PUBLISHED）
    const [a2] = await db.select({ latest: asset.latestVersionId }).from(asset).where(eq(asset.id, assetId));
    expect(a2!.latest).toBe(v1!.id);
  });

  it('非 PUBLISHED 拒（PENDING_REVIEW → 400 version_not_yankable）', async () => {
    const { assetId, versionRow } = await insertAssetAndVersion('2.0.0', 'PENDING_REVIEW');
    try {
      await yankVersion(db, audit, { assetId, version: versionRow, actorId: ownerId, reason: 'x' });
      throw new Error('expected notYankable');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected notYankable') throw err;
      expect((err as AssetError).code).toBe(assetErrorCodes.versionNotYankable);
    }
  });

  it('reason 空 → 400 yank_reason_required', async () => {
    const { assetId, versionRow } = await insertAssetAndVersion('3.0.0', 'PUBLISHED');
    try {
      await yankVersion(db, audit, { assetId, version: versionRow, actorId: ownerId, reason: '   ' });
      throw new Error('expected reasonRequired');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected reasonRequired') throw err;
      expect((err as AssetError).code).toBe(assetErrorCodes.yankReasonRequired);
    }
  });
});
