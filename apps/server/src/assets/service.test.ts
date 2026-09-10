import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { asset, userAccount } from '../db/schema/index.js';
import { AssetError, type AssetErrorCode, assetErrorCodes } from './errors.js';
import { createAsset, getAsset, listAssets } from './service.js';

let db: Db;

/** 本测试造的用户 displayName 前缀（afterAll 按前缀清理，禁全表 delete） */
const PREFIX = 'ast-';
let ownerA: string;

async function makeUser(tag: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
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
  // 按前缀清理（M1 纪律：禁全表 delete；FK 序：asset → user）
  await db.delete(asset).where(like(asset.slug, `${PREFIX}%`));
  await db.delete(userAccount).where(like(userAccount.displayName, `${PREFIX}%`));
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
