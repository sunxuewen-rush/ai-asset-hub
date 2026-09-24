import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { cleanupCreatedUsers, createTestUser } from '../test-utils/auth-fixture.js';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { asset, assetVersion } from '../db/schema/index.js';
import { AssetError, type AssetErrorCode, assetErrorCodes } from './errors.js';
import {
  type AssetSort,
  type AssetSortDir,
  createAsset,
  getAsset,
  listAssets,
  listViewableAssets,
} from './service.js';

let db: Db;

/** 本测试造的用户 displayName 前缀（afterAll 按前缀清理，禁全表 delete） */
const PREFIX = 'ast-';
let ownerA: string;

async function makeUser(tag: string): Promise<string> {
  return createTestUser(db, { id: `usr_${randomUUID()}`, displayName: `${PREFIX}${tag}` });
}

/** 捕获 AssetError 并断言 code（非 AssetError 原样抛出） */
async function expectAssetCode(promise: Promise<unknown>, code: AssetErrorCode): Promise<void> {
  try {
    await promise;
    throw new Error(`${PREFIX}expected AssetError ${code} but resolved`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith(`${PREFIX}expected AssetError`)) throw err;
    if (err instanceof AssetError) {
      expect(err.code).toBe(code);
      return;
    }
    throw err;
  }
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  ownerA = await makeUser('owner-a');
});

afterAll(async () => {
  // 按前缀清理（M1 纪律：禁全表 delete；FK 序：asset_version → asset → user ——
  // `asset_version.asset_id` **无 onDelete** ⇒ 必先删版本，否则 23503）
  const stale = (
    await db
      .select({ id: asset.id })
      .from(asset)
      .where(like(asset.slug, `${PREFIX}%`))
  ).map((r) => r.id);
  if (stale.length > 0) await db.delete(assetVersion).where(inArray(assetVersion.assetId, stale));
  await db.delete(asset).where(like(asset.slug, `${PREFIX}%`));
  await cleanupCreatedUsers(db);
  await db.$client.end();
});

describe('createAsset', () => {
  it('注册成功：裸 slug 坐标/owner/status ACTIVE 落位（S3：无 visibility 维度）', async () => {
    const row = await createAsset(db, {
      slug: 'ast-hello',
      type: 'skill',
      ownerId: ownerA,
    });
    expect(row.type).toBe('skill');
    expect(row.slug).toBe('ast-hello');
    expect(row.ownerId).toBe(ownerA);
    expect('visibility' in row).toBe(false); // M4-pre S3：可见性概念已删
    expect(row.status).toBe('ACTIVE');
    expect(row.downloadCount).toBe(0);
    expect(row.createdBy).toBe(ownerA);
    expect(row.latestVersionId).toBeNull();
  });

  it('createAsset 不接受可见性字段：写入行无 visibility 列（S3）', async () => {
    const row = await createAsset(db, {
      slug: 'ast-private',
      type: 'mcp',
      ownerId: ownerA,
    });
    expect('visibility' in row).toBe(false);
    expect(row.status).toBe('ACTIVE');
  });

  it('slug 冲突 → asset.slug_taken（跨类型唯一：同 slug 拒绝）', async () => {
    await expectAssetCode(
      createAsset(db, {
        slug: 'ast-hello',
        type: 'agent', // 换 type 仍冲突（type 不入唯一键，01 §3.3）
        ownerId: ownerA,
      }),
      assetErrorCodes.slugTaken,
    );
  });

  it('slug 全局唯一（坐标无空间维度）：重复注册 → asset.slug_taken', async () => {
    await expectAssetCode(
      createAsset(db, {
        slug: 'ast-hello', // 已由本测试先注册（M4-pre：global 唯一裸 slug）
        type: 'skill',
        ownerId: ownerA,
      }),
      assetErrorCodes.slugTaken,
    );
  });

  it('未注册 slug 直接注册成功（无空间维度门）', async () => {
    const row = await createAsset(db, {
      slug: 'ast-fresh',
      type: 'skill',
      ownerId: ownerA,
    });
    expect(row.slug).toBe('ast-fresh');
    expect(row.type).toBe('skill');
  });
});

describe('getAsset', () => {
  it('按裸 slug 命中', async () => {
    const row = await getAsset(db, 'ast-hello');
    expect(row).not.toBeNull();
    expect(row!.slug).toBe('ast-hello');
    expect(row!.type).toBe('skill');
  });

  it('slug 缺失 → null', async () => {
    expect(await getAsset(db, 'ast-missing')).toBeNull();
    expect(await getAsset(db, 'ast-hello')).not.toBeNull();
    expect(await getAsset(db, 'ast-private')).not.toBeNull();
  });
});

describe('listAssets', () => {
  it('全量 + total 正确', async () => {
    const { items, total } = await listAssets(db, { limit: 20, offset: 0 });
    // 只断言本测试前缀的资产都被数到（跨测试库有其他前缀资产，比较用相对断言）
    const mine = items.filter((a) => a.slug.startsWith(PREFIX));
    expect(mine.length).toBeGreaterThanOrEqual(3);
    expect(total).toBeGreaterThanOrEqual(items.length);
  });

  it('type 过滤', async () => {
    const { items } = await listAssets(db, { limit: 20, offset: 0, type: 'skill' });
    const mine = items.filter((a) => a.slug.startsWith(PREFIX));
    expect(mine.length).toBeGreaterThanOrEqual(2); // ast-hello + ast-fresh
    expect(mine.every((a) => a.type === 'skill')).toBe(true);
  });

  it('type 过滤（原 visibility 维度已删——S3）', async () => {
    const { items } = await listAssets(db, { limit: 20, offset: 0, type: 'mcp' });
    const mine = items.filter((a) => a.slug.startsWith(PREFIX));
    expect(mine.length).toBeGreaterThanOrEqual(1); // ast-private（mcp）
    expect(mine.every((a) => a.type === 'mcp')).toBe(true);
  });

  it('type × label 组合不命中 → 空列表（S3：原 type×visibility 组合已无第二维度）', async () => {
    const { items } = await listAssets(db, {
      limit: 20,
      offset: 0,
      type: 'agent',
      labelSlugs: ['nonexistent-label'],
    });
    const mine = items.filter((a) => a.slug.startsWith(PREFIX));
    expect(mine).toHaveLength(0);
    expect(items.every((a) => a.type === 'agent')).toBe(true);
  });

  it('分页 limit/offset + 稳定排序', async () => {
    const page1 = await listAssets(db, { limit: 1, offset: 0, type: 'skill' });
    const page2 = await listAssets(db, { limit: 1, offset: 1, type: 'skill' });
    expect(page1.items).toHaveLength(1);
    expect(page2.items).toHaveLength(1);
    // 稳定排序：createdAt desc + id desc（不重叠分页）
    expect(page1.items[0]!.id).not.toBe(page2.items[0]!.id);
  });
});

describe('listViewableAssets · sort（T11-f：白名单**三档** + 方向覆盖 + 静默回落 · T11-j `j3` 收敛）', () => {
  // fixture 四件（`ast-sort-*`）：下载 / 收藏 / 名称 / 作者四维互异；`q='ast-sort'` 收窄 ⇒
  // 断言只依赖本组数据（AGENTS.md：断言不依赖「库里只有本文件的数据」）
  const SORT_Q = 'ast-sort';
  const allUpdatedAt = new Date('2026-09-20T00:00:00.000Z'); // 同一 updated_at ⇒ 专测 tiebreaker
  const slugsOf = (rows: Array<{ slug: string }>) => rows.map((r) => r.slug);

  beforeAll(async () => {
    // 幂等：清本组历史残留（版本先删 —— FK 无级联）
    const stale = (
      await db
        .select({ id: asset.id })
        .from(asset)
        .where(like(asset.slug, `${SORT_Q}-%`))
    ).map((r) => r.id);
    if (stale.length > 0) {
      await db.delete(assetVersion).where(inArray(assetVersion.assetId, stale));
      await db.delete(asset).where(inArray(asset.id, stale));
    }
    const ownerSortA = await makeUser('sort-a'); // displayName = 'ast-sort-a'
    const ownerSortZ = await makeUser('sort-z'); // displayName = 'ast-sort-z'
    const spec: Array<{
      slug: string;
      owner: string;
      downloads: number;
      stars: number;
      name?: string;
    }> = [
      // owner 显示名序：ast-owner-a(a1) < ast-sort-a(a2,a4) < ast-sort-z(a3)
      { slug: 'ast-sort-a1', owner: ownerA, downloads: 5, stars: 30, name: 'zulu' },
      { slug: 'ast-sort-a2', owner: ownerSortA, downloads: 30, stars: 5, name: 'alpha' },
      { slug: 'ast-sort-a3', owner: ownerSortZ, downloads: 10, stars: 10, name: 'bravo' },
      { slug: 'ast-sort-a4', owner: ownerSortA, downloads: 0, stars: 0 }, // 无版本 ⇒ 名称回退 slug
    ];
    for (const s of spec) {
      const row = await createAsset(db, { slug: s.slug, type: 'skill', ownerId: s.owner });
      let latestVersionId: number | null = null;
      if (s.name !== undefined) {
        const [v] = await db
          .insert(assetVersion)
          .values({
            assetId: row.id,
            version: '1.0.0',
            status: 'PUBLISHED',
            parsedMetadataJson: { name: s.name },
          })
          .returning({ id: assetVersion.id });
        latestVersionId = v!.id;
      }
      await db
        .update(asset)
        .set({
          downloadCount: s.downloads,
          starCount: s.stars,
          latestVersionId,
          updatedAt: allUpdatedAt,
        })
        .where(eq(asset.id, row.id));
    }
  });

  it('缺省 sort ⇒ 现状排序（`updated_at desc, id desc`——行为零变化）· tiebreaker 稳定', async () => {
    const { items } = await listViewableAssets(db, { limit: 20, offset: 0, q: SORT_Q });
    // 四件 updated_at 相同 ⇒ 恰由 `id desc` 决定（插入序 a1→a4 ⇒ 倒序）
    expect(slugsOf(items)).toEqual(['ast-sort-a4', 'ast-sort-a3', 'ast-sort-a2', 'ast-sort-a1']);
  });

  it('downloads ⇒ 下载数降序（热度轴）', async () => {
    const { items } = await listViewableAssets(db, {
      limit: 20,
      offset: 0,
      q: SORT_Q,
      sort: 'downloads',
    });
    expect(slugsOf(items)).toEqual(['ast-sort-a2', 'ast-sort-a3', 'ast-sort-a1', 'ast-sort-a4']);
  });

  it('stars ⇒ 收藏数降序', async () => {
    const { items } = await listViewableAssets(db, {
      limit: 20,
      offset: 0,
      q: SORT_Q,
      sort: 'stars',
    });
    expect(slugsOf(items)).toEqual(['ast-sort-a1', 'ast-sort-a3', 'ast-sort-a2', 'ast-sort-a4']);
  });

  // ⚠️ **T11-j `j3` 下线留痕**（D0-8）：原三条 `name` / `author` 档用例已删 ——
  //    「`name` ⇒ 名称升序（latest 投影 · 无版本回退 slug）」·「`author` ⇒ owner 显示名升序」·
  //    「`name` / `author` 档零 join ⇒ 返回形状与行数不变」；理由与依据见批 design §1.5 / §8 与
  //    M4b-4 plan §3 `j3`（键不在表列上 · `en_US.utf8` 码点序 ⇒ 排出来就是错的）。
  it('dir 覆盖：显式 `desc` / `asc` 两态均生效（downloads 档双向 · 列头两态）', async () => {
    // `j3` 换档（原为 `name` 档 —— 随 D0-8 下线，见批 design §1.5）
    const desc = await listViewableAssets(db, {
      limit: 20,
      offset: 0,
      q: SORT_Q,
      sort: 'downloads',
      dir: 'desc',
    });
    expect(slugsOf(desc.items)).toEqual([
      'ast-sort-a2',
      'ast-sort-a3',
      'ast-sort-a1',
      'ast-sort-a4',
    ]);
    const asc = await listViewableAssets(db, {
      limit: 20,
      offset: 0,
      q: SORT_Q,
      sort: 'downloads',
      dir: 'asc',
    });
    expect(slugsOf(asc.items)).toEqual([
      'ast-sort-a4',
      'ast-sort-a1',
      'ast-sort-a3',
      'ast-sort-a2',
    ]);
  });

  it('非法档位 / 非法方向 ⇒ 静默回落（不抛错；= 缺省态）', async () => {
    const { items } = await listViewableAssets(db, {
      limit: 20,
      offset: 0,
      q: SORT_Q,
      sort: 'bogus' as AssetSort,
      dir: 'sideways' as AssetSortDir,
    });
    expect(slugsOf(items)).toEqual(['ast-sort-a4', 'ast-sort-a3', 'ast-sort-a2', 'ast-sort-a1']);
  });
});
