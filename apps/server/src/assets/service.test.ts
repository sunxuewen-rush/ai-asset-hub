import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { asset, namespace, userAccount } from '../db/schema/index.js';
import { AssetError, type AssetErrorCode, assetErrorCodes } from './errors.js';
import { createAsset, getAsset, listAssets } from './service.js';

let db: Db;

/** 本测试造的用户 displayName 前缀（afterAll 按前缀清理，禁全表 delete） */
const PREFIX = 'ast-';
let nsA: number; // 坐标空间
let nsB: number;
let ownerA: string;

async function makeUser(tag: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName: `${PREFIX}${tag}`, status: 'ACTIVE' });
  return id;
}

async function insertNs(slug: string): Promise<number> {
  const rows = await db
    .insert(namespace)
    .values({ slug, displayName: `${PREFIX}${slug}`, type: 'TEAM' })
    .returning({ id: namespace.id });
  return rows[0]!.id;
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
  nsA = await insertNs('ast-ns-a');
  nsB = await insertNs('ast-ns-b');
});

afterAll(async () => {
  // 按前缀清理（M1 纪律：禁全表 delete；FK 序：asset → namespace → user）
  await db.delete(asset).where(like(asset.slug, `${PREFIX}%`));
  await db.delete(namespace).where(like(namespace.slug, `${PREFIX}%`));
  await db.delete(userAccount).where(like(userAccount.displayName, `${PREFIX}%`));
  await db.$client.end();
});

describe('createAsset', () => {
  it('注册成功：坐标/owner/visibility 默认 PUBLIC/status ACTIVE 落位', async () => {
    const row = await createAsset(db, {
      namespaceSlug: 'ast-ns-a',
      slug: 'ast-hello',
      type: 'skill',
      ownerId: ownerA,
    });
    expect(row.type).toBe('skill');
    expect(row.slug).toBe('ast-hello');
    expect(row.ownerId).toBe(ownerA);
    expect(row.visibility).toBe('PUBLIC');
    expect(row.status).toBe('ACTIVE');
    expect(row.downloadCount).toBe(0);
    expect(row.createdBy).toBe(ownerA);
    expect(row.namespaceId).toBe(nsA);
  });

  it('visibility 显式 PRIVATE 落位（08 §5.1）', async () => {
    const row = await createAsset(db, {
      namespaceSlug: 'ast-ns-a',
      slug: 'ast-private',
      type: 'mcp',
      ownerId: ownerA,
      visibility: 'PRIVATE',
    });
    expect(row.visibility).toBe('PRIVATE');
  });

  it('slug 冲突 → asset.slug_taken（跨类型唯一：同 ns 同 slug 拒绝）', async () => {
    await expectAssetCode(
      createAsset(db, {
        namespaceSlug: 'ast-ns-a',
        slug: 'ast-hello',
        type: 'agent', // 换 type 仍冲突（type 不入唯一键，01 §3.3）
        ownerId: ownerA,
      }),
      assetErrorCodes.slugTaken,
    );
  });

  it('不同 namespace 同 slug 可注册（坐标含空间维度）', async () => {
    const row = await createAsset(db, {
      namespaceSlug: 'ast-ns-b',
      slug: 'ast-hello',
      type: 'skill',
      ownerId: ownerA,
    });
    expect(row.namespaceId).toBe(nsB);
  });

  it('namespace 不存在 → asset.namespace_not_found', async () => {
    await expectAssetCode(
      createAsset(db, {
        namespaceSlug: 'ast-no-such',
        slug: 'ast-x',
        type: 'skill',
        ownerId: ownerA,
      }),
      assetErrorCodes.namespaceNotFound,
    );
  });
});

describe('getAsset', () => {
  it('按坐标命中', async () => {
    const row = await getAsset(db, 'ast-ns-a', 'ast-hello');
    expect(row).not.toBeNull();
    expect(row!.slug).toBe('ast-hello');
    expect(row!.type).toBe('skill');
  });

  it('坐标缺失 → null（slug 错 / namespace 错）', async () => {
    expect(await getAsset(db, 'ast-ns-a', 'ast-missing')).toBeNull();
    expect(await getAsset(db, 'ast-ns-b', 'ast-hello')).not.toBeNull(); // ns-b 自己有
    expect(await getAsset(db, 'ast-ns-a', 'ast-private')).not.toBeNull();
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
    expect(mine.length).toBeGreaterThanOrEqual(2); // ast-hello × 2 空间
    expect(mine.every((a) => a.type === 'skill')).toBe(true);
  });

  it('namespaceSlug 过滤', async () => {
    const { items } = await listAssets(db, { limit: 20, offset: 0, namespaceSlug: 'ast-ns-a' });
    const mine = items.filter((a) => a.slug.startsWith(PREFIX));
    expect(mine.length).toBeGreaterThanOrEqual(2); // ast-hello + ast-private
    expect(mine.every((a) => a.namespaceId === nsA)).toBe(true);
  });

  it('namespace 不存在 → 空列表（非 404：列表语义）', async () => {
    const { items, total } = await listAssets(db, {
      limit: 20,
      offset: 0,
      namespaceSlug: 'ast-no-such',
    });
    expect(items).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('分页 limit/offset + 稳定排序', async () => {
    const page1 = await listAssets(db, { limit: 1, offset: 0, namespaceSlug: 'ast-ns-a' });
    const page2 = await listAssets(db, { limit: 1, offset: 1, namespaceSlug: 'ast-ns-a' });
    expect(page1.items).toHaveLength(1);
    expect(page2.items).toHaveLength(1);
    // 稳定排序：createdAt desc + id desc（不重叠分页）
    expect(page1.items[0]!.id).not.toBe(page2.items[0]!.id);
  });
});
