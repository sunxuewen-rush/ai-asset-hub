import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createAuditWriter } from '../audit/audit.js';
import { createClient, type Db } from '../db/client.js';
import { asset, assetFile, assetVersion, auditLog, userAccount } from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import { buildSkillZip } from '../test-utils/zip-builder.js';
import type { AssetError } from './errors.js';
import { assetErrorCodes } from './errors.js';
import { createVersion } from './versions.js';

process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'bun-';
let db!: Db;
let audit!: ReturnType<typeof createAuditWriter>;
let storage!: ReturnType<typeof createLocalStorage>;
let storageDir: string;
let userId: string;
let assetId: number;

beforeAll(async () => {
  db = createClient(
    process.env.DATABASE_URL ?? 'postgres://aih:aih@localhost:5433/ai_asset_hub_test',
  );
  await migrate(db, { migrationsFolder: './drizzle' });
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'bun-storage-'));
  storage = createLocalStorage(storageDir);
  userId = `${PREFIX}u_${randomUUID()}`;
  await db.insert(userAccount).values({ id: userId, displayName: `${PREFIX}u`, status: 'ACTIVE' });
  const [a] = await db
    .insert(asset)
    .values({
      slug: `${PREFIX}a-${randomUUID().slice(0, 8)}`,
      type: 'skill',
      ownerId: userId,
    })
    .returning({ id: asset.id });
  assetId = a!.id;
});

afterAll(async () => {
  const versionIds = (
    await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(eq(assetVersion.assetId, assetId))
  ).map((v) => v.id);
  if (versionIds.length > 0) {
    await db.delete(assetFile).where(inArray(assetFile.versionId, versionIds));
  }
  await db.delete(assetVersion).where(eq(assetVersion.assetId, assetId));
  await db.delete(asset).where(eq(asset.id, assetId));
  await db.delete(auditLog).where(eq(auditLog.actorId, userId));
  await db.delete(userAccount).where(eq(userAccount.id, userId));
  await rm(storageDir, { recursive: true, force: true });
  await db.$client.end();
});

function zipBytes(): Buffer {
  // buildSkillZip = 合法 skill 包（SKILL.md frontmatter + references）——族校验通过
  return Buffer.from(buildSkillZip());
}

describe('createVersion bundle 顺存（design §7.1 R13）', () => {
  it('上传 → bundle_storage_key/bundle_sha256 落位（zip 原包 + 双通道校验承诺）', async () => {
    const file = zipBytes();
    const out = await createVersion(db, storage, audit, {
      asset: { id: assetId, type: 'skill' },
      uploaderId: userId,
      file,
      version: '1.0.0',
    });
    const [ver] = await db
      .select({
        bundleStorageKey: assetVersion.bundleStorageKey,
        bundleSha256: assetVersion.bundleSha256,
      })
      .from(assetVersion)
      .where(eq(assetVersion.id, out.id));
    expect(ver!.bundleStorageKey).toContain(`/${out.id}/bundle.zip`);
    expect(ver!.bundleSha256).toBe(createHash('sha256').update(file).digest('hex')); // zip 整体 sha 双通道
    // 存储中真实可读（zip 原包字节一致——local storage 文件布局 {root}/{key}）
    const got = await readFile(join(storageDir, ver!.bundleStorageKey!));
    expect(got.toString('hex')).toBe(file.toString('hex'));
  });
});

describe('SCAN_FAILED 同版本重传豁免（design §3.4 R5）', () => {
  it('SCAN_FAILED 同号重传 → 成功覆写（旧行清 + 新 DRAFT + 存储清理）', async () => {
    // 造 SCAN_FAILED 旧行（模拟扫描失败留档——直插行 + 真文件 + asset_file 行挂载，
    // 覆写清理按 asset_file 收集存储 key——与真实上传路径同构）
    const [oldVer] = await db
      .insert(assetVersion)
      .values({
        assetId,
        version: '9.9.9',
        status: 'SCAN_FAILED',
        createdBy: userId,
        fileCount: 0,
        totalSize: 0,
      })
      .returning({ id: assetVersion.id });
    const oldKey = `${assetId}/${oldVer!.id}/broken.txt`;
    await storage.put(oldKey, Buffer.from('broken'), { contentType: 'text/plain' });
    await db.insert(assetFile).values({
      versionId: oldVer!.id,
      filePath: 'broken.txt',
      fileSize: 7,
      sha256: 'a'.repeat(64),
      storageKey: oldKey,
    });

    const file = zipBytes();
    const out = await createVersion(db, storage, audit, {
      asset: { id: assetId, type: 'skill' },
      uploaderId: userId,
      file,
      version: '9.9.9', // 同号
    });
    expect(out.status).toBe('DRAFT');
    // 旧行已删（新行是新 id）
    const oldRow = await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(eq(assetVersion.id, oldVer!.id));
    expect(oldRow).toHaveLength(0);
    // 旧文件存储已清（deleteMany 事后——exists 断言）
    expect(await storage.exists(oldKey)).toBe(false);
  });

  it('DRAFT 同号重传 → 409 version_conflict（豁免仅 SCAN_FAILED）', async () => {
    const file = zipBytes();
    const first = await createVersion(db, storage, audit, {
      asset: { id: assetId, type: 'skill' },
      uploaderId: userId,
      file,
      version: '8.8.8',
    });
    void first;
    try {
      await createVersion(db, storage, audit, {
        asset: { id: assetId, type: 'skill' },
        uploaderId: userId,
        file,
        version: '8.8.8',
      });
      throw new Error('expected conflict');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected conflict') throw err;
      expect((err as AssetError).code).toBe(assetErrorCodes.versionConflict);
    }
  });
});
