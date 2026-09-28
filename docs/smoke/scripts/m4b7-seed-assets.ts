/**
 * M4b-7 发布批造数（`docs/smoke/scripts/m4b7-seed-assets.ts` · design **§9.5** · plan **T9 步骤 1** · 件 **N9**）。
 *
 * 造什么（4 行 · 前缀 `m4b7-` ⇒ 可识别、收尾可删）：
 *   | slug            | 族  | 资产态 | 版本                        | 用途 |
 *   |-----------------|-----|--------|-----------------------------|------|
 *   | `m4b7-fix-1`    | mcp | HIDDEN | **1.0.0 PUBLISHED（= latest）** | 「选用已有资产」支 + 上下文行「当前最新版 1.0.0」+ 预填 **1.0.1** |
 *   |                 |     |        | **0.0.1 PENDING_REVIEW**    | 版本冲突 409（跳 2 重传同号）+ 「失败·已有版本」引导（D42）|
 *   | `m4b7-fix-2`    | mcp | HIDDEN | （0 版本空壳）               | 空壳 ⇒ 预填 `1.0.0`（C3）+ 公开接受项 |
 *   | （task）        | —   | —      | 指向 `m4b7-fix-1@0.0.1`      | `PENDING` review ⇒ 「我的提交」有在审条目 + 「撤回提交」出口（G7）|
 *
 * 两处**与 design §9.5 字面不同的选择**（已在 design §9.8 登记 **F235**）：
 *   ① 资产态用 **`HIDDEN`**（design 写 `ACTIVE`）—— 零门户污染（对齐 `m4b5-seed-*` 先例）；
 *      「选用已有资产」走 `GET /api/me/assets`（owner 自己的面，含 `HIDDEN`）⇒ 不受影响。
 *   ② `m4b7-fix-1` **确有一条 `PUBLISHED` 版本** —— design 同时要求「不造 PUBLISHED 版本」与
 *      「预填正常 +1 分支」（G4 点名），二者自相矛盾：`latestVersion` 只来自已发布版本 ⇒ 无它则
 *      该分支不可达。取「造 1 条 + 资产 HIDDEN」以两全。
 *
 * 纪律：
 * - **幂等 · 可重放**：全部「有则改、无则建」；重跑即把 dogfood 改过的行复位。
 * - **只碰本前缀**：`m4b7-fix-*`（+ 其版本/文件/task/审计行）；不清任何全表，**不动** `m4b2_user` 的口令/档位。
 * - 写库**须用户授权**（本批已获授权）；口令只从 env 读（`SMOKE_M4B2_PASSWORD`），仓库内不落任何口令。
 *
 * 用法（**仓库根**）：
 *   bun --env-file=apps/server/.env docs/smoke/scripts/m4b7-seed-assets.ts
 *   bun --env-file=apps/server/.env docs/smoke/scripts/m4b7-seed-assets.ts --clean
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '../../../apps/server/src/db/client.js';
import type { AssetType, VersionStatus } from '../../../apps/server/src/db/schema/assets.js';
import {
  asset,
  assetFile,
  assetVersion,
  reviewTask,
} from '../../../apps/server/src/db/schema/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required（提示：bun --env-file=apps/server/.env …）');
  process.exit(1);
}

const PREFIX = 'm4b7-fix-';
/**
 * **清理前缀**（比造数前缀更宽）：`m4b7-` —— 同时覆盖 dogfood **自产**的 `m4b7-dogfood-*`
 * 资产（G5 链建的、止步 PENDING_REVIEW 的那些）。**首跑缺口**：原清理只认 `m4b7-fix-` ⇒
 * dogfood 的产物没人收（收尾会留垃圾）—— 本批 T9 收口实测修正。
 */
const CLEAN_PREFIX = 'm4b7-';
const OWNER_NAME = 'm4b2_user';
const STORAGE_ROOT = path.resolve(process.cwd(), 'apps/server/storage');
const clean = process.argv.includes('--clean');

const db = createClient(connectionString);
const pg = db.$client;

/** 造出的资产 id（收尾清理与统计用） */
let assetIds: number[] = [];

async function ownerId(): Promise<string> {
  const found = await pg.query<{ id: string }>('select id from "user" where username = $1', [
    OWNER_NAME,
  ]);
  const id = found.rows[0]?.id;
  if (!id) throw new Error(`账号不存在：${OWNER_NAME}（先跑 m4b2-seed-roles.ts）`);
  return id;
}

/* ── 清理（`--clean` · 连带审计行） ── */
async function cleanup(): Promise<number> {
  const { rows } = await pg.query<{ id: number; slug: string }>(
    'select id, slug from asset where slug like $1',
    [`${CLEAN_PREFIX}%`],
  );
  if (rows.length === 0) {
    console.log('（无本前缀资产，跳过清理）');
    return 0;
  }
  const ids = rows.map((r) => r.id);
  const slugs = rows.map((r) => r.slug);
  // 审计行：① 以资产为 target 的动作（`target_type='asset'` · `target_id` = 资产 id 字符串）
  //         ② `detail` 里提到的 slug（如「放弃该资产」类动作）
  // ⚠️ 列名真值：`audit_log.detail`（**不是** payload）· `target_id` / `target_type` —— 首次实现猜错列名吃过 42703
  const byTarget = await pg.query(
    "delete from audit_log where target_type = 'asset' and target_id = any($1::text[])",
    [ids.map(String)],
  );
  let auditDeleted = byTarget.rowCount ?? 0;
  for (const slug of slugs) {
    const res = await pg.query('delete from audit_log where detail::text like $1', [`%${slug}%`]);
    auditDeleted += res.rowCount ?? 0;
  }
  await pg.query(
    'delete from review_task where asset_version_id in (select id from asset_version where asset_id = any($1))',
    [ids],
  );
  await pg.query(
    'delete from asset_file where version_id in (select id from asset_version where asset_id = any($1))',
    [ids],
  );
  await pg.query('delete from asset_version where asset_id = any($1)', [ids]);
  await pg.query('delete from asset where id = any($1)', [ids]);
  console.log(
    `✓ 已回收：资产 ${ids.length} 个（${slugs.join(', ')}）+ 版本/文件/task + 审计行 ${auditDeleted} 条`,
  );
  return ids.length;
}

if (clean) {
  await cleanup();
  await pg.end();
  process.exit(0);
}

await cleanup(); // 幂等：先清后插

const owner = await ownerId();

async function ensureAsset(slug: string, type: AssetType): Promise<number> {
  const found = await pg.query<{ id: number }>('select id from asset where slug = $1', [slug]);
  const existing = found.rows[0];
  if (existing) {
    await pg.query(
      "update asset set owner_id = $1, status = 'HIDDEN', updated_by = $1, updated_at = now() where id = $2",
      [owner, existing.id],
    );
    return existing.id;
  }
  const inserted = await db
    .insert(asset)
    .values({
      slug,
      type,
      ownerId: owner,
      status: 'HIDDEN',
      createdBy: owner,
      updatedBy: owner,
    })
    .returning({ id: asset.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert asset 未返回行：${slug}`);
  return created.id;
}

async function ensureVersion(
  assetId: number,
  version: string,
  status: VersionStatus,
  manifest: Record<string, unknown>,
): Promise<number> {
  const found = await pg.query<{ id: number }>(
    'select id from asset_version where asset_id = $1 and version = $2',
    [assetId, version],
  );
  const existing = found.rows[0];
  if (existing) {
    await pg.query(
      'update asset_version set status = $1, manifest_json = $2::jsonb, parsed_metadata_json = $3::jsonb where id = $4',
      [
        status,
        JSON.stringify(manifest),
        JSON.stringify({ description: manifest.description ?? null }),
        existing.id,
      ],
    );
    return existing.id;
  }
  const inserted = await db
    .insert(assetVersion)
    .values({
      assetId,
      version,
      status,
      createdBy: owner,
      fileCount: 1,
      manifestJson: manifest,
      parsedMetadataJson: { description: manifest.description ?? null },
    })
    .returning({ id: assetVersion.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert asset_version 未返回行：${assetId}/${version}`);
  return created.id;
}

/** 写一条真实文件 + `asset_file` 行（存储层布局同 `versions.ts`：`<assetId>/<versionId>/<path>`） */
async function ensureFile(assetId: number, versionId: number, filePath: string, content: string) {
  const full = path.join(STORAGE_ROOT, String(assetId), String(versionId), filePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content, 'utf8');
  const buf = Buffer.from(content, 'utf8');
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const storageKey = `${assetId}/${versionId}/${filePath}`;
  const existing = await pg.query<{ id: number }>(
    'select id from asset_file where version_id = $1 and file_path = $2',
    [versionId, filePath],
  );
  if (existing.rows[0]) {
    await pg.query(
      'update asset_file set file_size = $1, sha256 = $2, storage_key = $3 where id = $4',
      [buf.byteLength, sha256, storageKey, existing.rows[0].id],
    );
    return;
  }
  await db.insert(assetFile).values({
    versionId,
    filePath,
    fileSize: buf.byteLength,
    contentType: filePath.endsWith('.md') ? 'text/markdown' : 'application/json',
    sha256,
    storageKey,
  });
}

/** 回填该版本的 `file_count` / `total_size`（与写入路径一致，防「有文件但计数为 0」） */
async function syncVersionCounts(versionId: number) {
  await pg.query(
    'update asset_version set file_count = (select count(*) from asset_file where version_id = $1), total_size = (select coalesce(sum(file_size), 0) from asset_file where version_id = $1) where id = $1',
    [versionId],
  );
}

/* ── ① m4b7-fix-1：有版本（1.0.0 PUBLISHED = latest + 0.0.1 PENDING_REVIEW） ── */
const fix1 = await ensureAsset(`${PREFIX}1`, 'mcp');
const v1 = await ensureVersion(fix1, '1.0.0', 'PUBLISHED', {
  name: 'm4b7-fix-1',
  description: 'M4b-7 造数：有已发布版本的资产（选已有支 + 预填 patch+1）',
  servers: [{ name: 'fake', type: 'http', url: 'https://example.invalid/mcp' }],
});
await ensureFile(
  fix1,
  v1,
  'mcp.json',
  '{"servers":[{"name":"fake","url":"https://example.invalid/mcp"}]}\n',
);
await syncVersionCounts(v1);
const v001 = await ensureVersion(fix1, '0.0.1', 'PENDING_REVIEW', {
  name: 'm4b7-fix-1',
  description: 'M4b-7 造数：在审版本（版本冲突 409 + 撤回出口）',
  servers: [{ name: 'fake', type: 'http', url: 'https://example.invalid/mcp' }],
});
await ensureFile(
  fix1,
  v001,
  'mcp.json',
  '{"servers":[{"name":"fake","url":"https://example.invalid/mcp"}]}\n',
);
await syncVersionCounts(v001);
// 指针：`latest_version_id` → 1.0.0（决定选择器上下文行与预填）
await pg.query('update asset set latest_version_id = $1, updated_at = now() where id = $2', [
  v1,
  fix1,
]);
// 一条 PENDING task（「我的提交」在审条目；撤回出口的既有面）
const taskFound = await pg.query<{ id: number }>(
  "select id from review_task where asset_version_id = $1 and status = 'PENDING'",
  [v001],
);
if (!taskFound.rows[0]) {
  await db.insert(reviewTask).values({
    assetVersionId: v001,
    status: 'PENDING',
    version: 1,
    submittedBy: owner,
  });
}

/* ── ② m4b7-fix-2：零版本空壳（预填 1.0.0） ── */
const fix2 = await ensureAsset(`${PREFIX}2`, 'mcp');
await pg.query('update asset set latest_version_id = null, updated_at = now() where id = $1', [
  fix2,
]);

/* ── ③ m4b7-fix-3：latest = `2.0.0-pre`（**G4 点名**的「`-pre` ⇒ 剥段补位」分支 · F236 补） ── */
const fix3 = await ensureAsset(`${PREFIX}3`, 'mcp');
const vPre = await ensureVersion(fix3, '2.0.0-pre', 'PUBLISHED', {
  name: 'm4b7-fix-3',
  description: 'M4b-7 造数：latest 为被否决预发布版本（预填剥离 `-pre` 段 ⇒ 2.0.0）',
  servers: [{ name: 'fake', type: 'http', url: 'https://example.invalid/mcp' }],
});
await ensureFile(
  fix3,
  vPre,
  'mcp.json',
  '{"servers":[{"name":"fake","url":"https://example.invalid/mcp"}]}\n',
);
await syncVersionCounts(vPre);
await pg.query('update asset set latest_version_id = $1, updated_at = now() where id = $2', [
  vPre,
  fix3,
]);

assetIds = [fix1, fix2, fix3];

console.log('✓ 造数完成（幂等）：');
console.log(
  `  · m4b7-fix-1 (id=${fix1}) HIDDEN · 版本 1.0.0 PUBLISHED(=latest) + 0.0.1 PENDING_REVIEW + 1 PENDING task`,
);
console.log(`  · m4b7-fix-2 (id=${fix2}) HIDDEN · 0 版本（空壳）`);
console.log(`  · m4b7-fix-3 (id=${fix3}) HIDDEN · 2.0.0-pre PUBLISHED(=latest ⇒ 预填剥段 2.0.0）`);
console.log(
  `  清理：bun --env-file=apps/server/.env docs/smoke/scripts/m4b7-seed-assets.ts --clean`,
);
await pg.end();
