import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, inArray, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createAuditWriter } from '../audit/audit.js';
import { createClient, type Db } from '../db/client.js';
import {
  ACCOUNT_ROLE,
  type AccountRole,
  asset,
  assetFile,
  assetVersion,
  auditLog,
  namespace,
  namespaceMember,
  userAccount,
} from '../db/schema/index.js';
import { createLocalStorage } from '../storage/local.js';
import { buildZip } from '../test-utils/zip-builder.js';
import { AssetError, assetErrorCodes, UploadValidationError } from './errors.js';
import { createVersion } from './versions.js';

process.env.SESSION_SECRET ??= 'x'.repeat(40);

const PREFIX = 'vup-';
const dbUrl = process.env.DATABASE_URL ?? 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';

let db!: Db;
let storageDir: string;
let storage!: ReturnType<typeof createLocalStorage>;
let audit!: ReturnType<typeof createAuditWriter>;
let nsId: number;
let owner: string;
let assetId: number;

async function makeUser(tag: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db
    .insert(userAccount)
    .values({ id, displayName: `${PREFIX}${tag}-${randomUUID().slice(0, 8)}`, status: 'ACTIVE' });
  return id;
}

async function setRole(userId: string, role: AccountRole): Promise<void> {
  await db.update(userAccount).set({ role }).where(eq(userAccount.id, userId));
}

async function insertNs(slug: string): Promise<number> {
  const [r] = await db
    .insert(namespace)
    .values({ slug, displayName: `${PREFIX}${slug}`, type: 'TEAM', createdBy: owner })
    .returning({ id: namespace.id });
  return r!.id;
}

async function insertAsset(slug: string): Promise<number> {
  const [r] = await db
    .insert(asset)
    .values({ namespaceId: nsId, slug, type: 'skill', ownerId: owner })
    .returning({ id: asset.id });
  return r!.id;
}

function validSkillZip(): Buffer {
  return buildZip([
    {
      name: 'SKILL.md',
      content: '---\nname: demo-skill\ndescription: upload test\n---\n# Demo\n\nbody content\n',
    },
    { name: 'references/guide.md', content: '# Guide\n' },
    { name: 'assets/icon.svg', content: '<svg/>' },
  ]);
}

function badSkillZip(): Buffer {
  return buildZip([
    { name: 'SKILL.md', content: 'no frontmatter here\n' },
    { name: 'evil.exe', content: 'MZ' },
  ]);
}

beforeAll(async () => {
  db = createClient(dbUrl);
  await migrate(db, { migrationsFolder: './drizzle' });
  audit = createAuditWriter(db);
  storageDir = await mkdtemp(join(tmpdir(), 'vup-storage-'));
  storage = createLocalStorage(storageDir);
  owner = await makeUser('owner');
  await setRole(owner, ACCOUNT_ROLE.ADMIN);
  nsId = await insertNs('vup-ns');
  await db.insert(namespaceMember).values({ namespaceId: nsId, userId: owner, role: 'OWNER' });
  assetId = await insertAsset('demo-skill');
});

afterAll(async () => {
  const nsRows = await db
    .select({ id: namespace.id })
    .from(namespace)
    .where(like(namespace.slug, `${PREFIX}%`));
  const ids = nsRows.map((n) => n.id);
  if (ids.length > 0) {
    const vRows = await db
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(
        inArray(
          assetVersion.assetId,
          db.select({ id: asset.id }).from(asset).where(inArray(asset.namespaceId, ids)),
        ),
      );
    const vIds = vRows.map((v) => v.id);
    if (vIds.length > 0) {
      await db.delete(assetFile).where(inArray(assetFile.versionId, vIds));
      await db.delete(assetVersion).where(inArray(assetVersion.id, vIds));
    }
    await db.delete(asset).where(inArray(asset.namespaceId, ids));
    await db.delete(namespaceMember).where(inArray(namespaceMember.namespaceId, ids));
    await db.delete(namespace).where(inArray(namespace.id, ids));
  }
  const users = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, `${PREFIX}%`));
  const userIds = users.map((u) => u.id);
  if (userIds.length > 0) {
    await db.delete(auditLog).where(inArray(auditLog.actorId, userIds));
  }
  await db.delete(userAccount).where(like(userAccount.displayName, `${PREFIX}%`));
  await rm(storageDir, { recursive: true, force: true });
  await db.$client.end();
});

async function versionCount(): Promise<number> {
  const rows = await db
    .select({ id: assetVersion.id })
    .from(assetVersion)
    .where(eq(assetVersion.assetId, assetId));
  return rows.length;
}

async function storedFileCount(): Promise<number> {
  const { readdir } = await import('node:fs/promises');
  const walk = async (dir: string): Promise<number> => {
    let count = 0;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) count += await walk(full);
      else count += 1;
    }
    return count;
  };
  return walk(storageDir);
}

describe('createVersion 上传服务（design §6 先验后落）', () => {
  it('合法 skill 包全链：DRAFT 版本行 + file 行 + 存储文件 + sha256 一致 + 投影落库', async () => {
    const zip = validSkillZip();
    const created = await createVersion(db, storage, audit, {
      asset: { id: assetId, namespaceId: nsId, type: 'skill' },
      uploaderId: owner,
      file: zip,
      version: '1.0.0',
      changelog: 'first upload',
    });

    expect(created.status).toBe('DRAFT');
    expect(created.fileCount).toBe(3);
    expect(created.totalSize).toBeGreaterThan(0);

    // file 行 + 存储存在 + sha256 与上传内容一致（内容已知——预计算比对）
    const fileRows = await db.select().from(assetFile).where(eq(assetFile.versionId, created.id));
    expect(fileRows).toHaveLength(3);
    const paths = fileRows.map((f) => f.filePath).sort();
    expect(paths).toEqual(['SKILL.md', 'assets/icon.svg', 'references/guide.md']);
    const knownContents: Record<string, string> = {
      'SKILL.md': '---\nname: demo-skill\ndescription: upload test\n---\n# Demo\n\nbody content\n',
      'references/guide.md': '# Guide\n',
      'assets/icon.svg': '<svg/>',
    };
    for (const f of fileRows) {
      expect(await storage.exists(f.storageKey)).toBe(true); // 存储文件实存
      expect(f.sha256).toBe(createHash('sha256').update(knownContents[f.filePath]!).digest('hex'));
    }

    // 投影落库断言（manifest_json/parsed_metadata_json）
    const [row] = await db.select().from(assetVersion).where(eq(assetVersion.id, created.id));
    expect(row!.manifestJson).toMatchObject({ name: 'demo-skill' });
    const parsed = row!.parsedMetadataJson as { name: string; searchText: string };
    expect(parsed.name).toBe('demo-skill');
    expect(parsed.searchText).toContain('Demo body content');

    // 审计行
    const auditRows = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.actorId, owner));
    expect(auditRows.some((a) => a.action === 'asset.version_upload')).toBe(true);
  });

  it('版本冲突 409（同资产同版本号不可覆写）', async () => {
    try {
      await createVersion(db, storage, audit, {
        asset: { id: assetId, namespaceId: nsId, type: 'skill' },
        uploaderId: owner,
        file: validSkillZip(),
        version: '1.0.0',
      });
      throw new Error('expected versionConflict');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected versionConflict') throw err;
      expect(err).toBeInstanceOf(AssetError);
      expect((err as AssetError).code).toBe(assetErrorCodes.versionConflict);
    }
  });

  it('校验失败零落库（UploadValidationError + 版本行 0 + 存储 0 新文件）', async () => {
    const beforeFiles = await storedFileCount();
    const beforeVersions = await versionCount();
    try {
      await createVersion(db, storage, audit, {
        asset: { id: assetId, namespaceId: nsId, type: 'skill' },
        uploaderId: owner,
        file: badSkillZip(),
        version: '9.9.9',
      });
      throw new Error('expected UploadValidationError');
    } catch (err) {
      if (err instanceof Error && err.message === 'expected UploadValidationError') throw err;
      expect(err).toBeInstanceOf(UploadValidationError);
      const uv = err as UploadValidationError;
      expect(uv.issues.length).toBeGreaterThan(0);
      // 双违规累积：evil.exe 白名单外 + SKILL.md 无 frontmatter
      const codes = uv.issues.map((i) => i.code);
      expect(codes).toContain('unsupported_file_type');
      expect(codes).toContain('invalid_skill_frontmatter');
    }
    expect(await versionCount()).toBe(beforeVersions);
    expect(await storedFileCount()).toBe(beforeFiles);
  });

  it('多版本独立落库（版本号演进 + file 行各自归属）', async () => {
    const v2 = await createVersion(db, storage, audit, {
      asset: { id: assetId, namespaceId: nsId, type: 'skill' },
      uploaderId: owner,
      file: validSkillZip(),
      version: '2.0.0',
      changelog: 'v2',
    });
    expect(v2.version).toBe('2.0.0');
    expect(await versionCount()).toBe(2);
    const filesV2 = await db
      .select({ id: assetFile.id })
      .from(assetFile)
      .where(eq(assetFile.versionId, v2.id));
    expect(filesV2).toHaveLength(3);
  });
});
