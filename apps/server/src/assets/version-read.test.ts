import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createClient, type Db } from '../db/client.js';
import {
  asset,
  assetVersion,
  namespace,
  namespaceMember,
  userAccount,
  type VersionStatus,
} from '../db/schema/index.js';
import type { VersionViewer } from './version-read.js';
import { getVersion, listVersions } from './version-read.js';

process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'vrw-';
const dbUrl = process.env.DATABASE_URL ?? 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';

let db!: Db;
let nsId: number;
let ownerId: string;
let contributorId: string; // 版本上传者（ns MEMBER）
let adminId: string; // 空间 ADMIN（非 owner 非上传者）
let assetAdminId: string; // 平台 ASSET_ADMIN（非 ns 成员）
let strangerId: string; // ns 外用户
let assetId: number;

async function makeUser(tag: string): Promise<string> {
  const id = `${PREFIX}${tag}_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}

function viewerFor(
  uid: string | null,
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | null,
  extra?: Partial<VersionViewer>,
): VersionViewer {
  return { viewerId: uid, namespaceRole: role, isSuperAdmin: false, isPlatformReviewer: false, ...extra };
}

const ALL_STATES: VersionStatus[] = ['DRAFT', 'UPLOADED', 'PENDING_REVIEW', 'SCAN_FAILED', 'REJECTED', 'PUBLISHED', 'YANKED'];

async function seedVersions(): Promise<void> {
  // 每个状态一个版本（版本号 = 状态名小写，createdBy = contributorId）
  for (const [i, status] of ALL_STATES.entries()) {
    await db.insert(assetVersion).values({
      assetId,
      version: `${i + 1}.0.0`,
      status,
      createdBy: contributorId,
    });
  }
}

beforeAll(async () => {
  db = createClient(dbUrl);
  await migrate(db, { migrationsFolder: './drizzle' });
  ownerId = await makeUser('owner');
  contributorId = await makeUser('contributor');
  adminId = await makeUser('admin');
  assetAdminId = await makeUser('platform');
  strangerId = await makeUser('stranger');
  const [ns] = await db
    .insert(namespace)
    .values({ slug: `${PREFIX}ns-${randomUUID().slice(0, 8)}`, displayName: `${PREFIX}ns`, type: 'TEAM', createdBy: ownerId })
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
  await seedVersions();
});

afterAll(async () => {
  await db.delete(assetVersion).where(eq(assetVersion.assetId, assetId));
  await db.delete(asset).where(eq(asset.id, assetId));
  await db.delete(namespaceMember).where(like(namespaceMember.userId, `${PREFIX}%`));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  await db.delete(userAccount).where(like(userAccount.id, `${PREFIX}%`));
  await db.$client.end();
});

async function listStatuses(viewer: VersionViewer): Promise<string[]> {
  const { items } = await listVersions(db, assetId, ownerId, viewer, { limit: 50, offset: 0 });
  return items.map((i) => i.status);
}

describe('version-read 八态读面（design §3.6 R7——T6 回归：非授权者零泄露未公开族）', () => {
  it('匿名：仅见曾公开族 PUBLISHED/YANKED（六未公开态全过滤）', async () => {
    const statuses = await listStatuses(viewerFor(null, null));
    expect(statuses.sort()).toEqual(['PUBLISHED', 'YANKED']);
  });

  it('非成员登录（无角色非上传者）：同匿名——仅曾公开族', async () => {
    const statuses = await listStatuses(viewerFor(strangerId, null));
    expect(statuses.sort()).toEqual(['PUBLISHED', 'YANKED']);
  });

  it('ns MEMBER 非上传者：仅曾公开族（成员身份不扩版本读面）', async () => {
    const statuses = await listStatuses(viewerFor(strangerId, 'MEMBER'));
    expect(statuses.sort()).toEqual(['PUBLISHED', 'YANKED']);
  });

  it('上传者本人（contributor——非 owner MEMBER）：全见未公开族', async () => {
    const statuses = await listStatuses(viewerFor(contributorId, 'MEMBER'));
    expect(statuses).toHaveLength(ALL_STATES.length);
  });

  it('asset owner：全见', async () => {
    const statuses = await listStatuses(viewerFor(ownerId, 'OWNER'));
    expect(statuses).toHaveLength(ALL_STATES.length);
  });

  it('空间 ADMIN（非 owner 非上传者）：全见', async () => {
    const statuses = await listStatuses(viewerFor(adminId, 'ADMIN'));
    expect(statuses).toHaveLength(ALL_STATES.length);
  });

  it('平台 ASSET_ADMIN（非 ns 成员）：全见（R7 审核角色扩展——isPlatformReviewer）', async () => {
    const statuses = await listStatuses(viewerFor(assetAdminId, null, { isPlatformReviewer: true }));
    expect(statuses).toHaveLength(ALL_STATES.length);
  });

  it('SUPER_ADMIN 短路：全见', async () => {
    const statuses = await listStatuses(viewerFor(ownerId, null, { isSuperAdmin: true }));
    expect(statuses).toHaveLength(ALL_STATES.length);
  });
});

describe('getVersion 详情授权（三态：null / restricted / detail）', () => {
  it('匿名详情：PUBLISHED/YANKED 可读（曾公开留档）；未公开族 → restricted', async () => {
    const anon = viewerFor(null, null);
    const published = await getVersion(db, assetId, ownerId, '6.0.0', anon);
    expect(published).not.toBeNull();
    expect(published).not.toBe('restricted');
    const yanked = await getVersion(db, assetId, ownerId, '7.0.0', anon);
    expect(yanked).not.toBe('restricted');
    for (const v of ['1.0.0', '2.0.0', '3.0.0', '4.0.0', '5.0.0']) {
      expect(await getVersion(db, assetId, ownerId, v, anon)).toBe('restricted');
    }
  });

  it('上传者本人详情：未公开族全可读（含自身 PENDING_REVIEW/REJECTED）', async () => {
    const viewer = viewerFor(contributorId, 'MEMBER');
    for (const v of ['1.0.0', '2.0.0', '3.0.0', '4.0.0', '5.0.0', '6.0.0', '7.0.0']) {
      const d = await getVersion(db, assetId, ownerId, v, viewer);
      expect(d).not.toBeNull();
      expect(d).not.toBe('restricted');
    }
  });

  it('版本不存在 → null', async () => {
    expect(await getVersion(db, assetId, ownerId, '9.9.9', viewerFor(null, null))).toBeNull();
  });
});
