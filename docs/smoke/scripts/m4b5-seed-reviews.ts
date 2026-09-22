// M4b-5 审核批造数（可重放 · 幂等 · 零 delete · 批 design §9.6 · 批 plan T10 步骤 1）
//
// 用途：造出 G1–G10 需要的审核数据（**8 条 fixture** —— 比 §9.6 的 6 条多 2 条，见 F189）：
//   账号  m4b5_owner（资产 owner · role=user）· m4b5_member（上传者/提交人 · role=user）
//         —— **不碰** m4b2_user / m4b2_mgr / m4b2_super / m4b4_outsider（管理档与超管沿用既有账号）
//   资产（**一律 `status=HIDDEN`** ⇒ 零门户列表污染 + 零「我的资产」污染；审核人 = 管理档在授权集内照样可审可预览）
//
//   #  slug                族     资产态   版本                               task            用途
//   ①  m4b5-seed-skill     skill  HIDDEN  1.0.0 UPLOADED                     PENDING         §9.6① ：skill 主文档分支（含 SKILL.md）
//   ②  m4b5-seed-mcp       mcp    HIDDEN  1.0.0 UPLOADED                     PENDING         §9.6② ：servers 2 条（stdio 1 + http 1）· **不造 README**
//   ③  m4b5-seed-agent     agent  HIDDEN  1.0.0 UPLOADED                     PENDING         §9.6③ ：**不造 README** ⇒ 实证回退分支
//   ④  m4b5-seed-rejected  skill  HIDDEN  1.0.0 REJECTED                     REJECTED(+原因) §9.6④ ：不可预览说明行 + 驳回原因行
//   ⑤  m4b5-seed-withdrawn skill  HIDDEN  1.0.0 UPLOADED                     WITHDRAWN       §9.6⑤ ：已撤回状态行
//   ⑥  m4b5-seed-b1        skill  HIDDEN  1.0.0 UPLOADED                     PENDING         §9.6⑥ ：B1 边界（owner=m4b5_owner / 提交人=m4b5_member）
//   ⑦  m4b5-seed-compare   skill  HIDDEN  1.0.0 PUBLISHED(latest) + 1.1.0 UPLOADED  PENDING  **F189 追加**：**可比态变更对比**（G10 ①⑧ 需要真实 patch）
//   ⑧  m4b5-seed-samever   skill  HIDDEN  1.0.0 PUBLISHED(latest)           PENDING(指向同版本) **F189 追加**：**同版本重审 ⇒ 卡内空态**（G10 ⑦）
//
//   ⚠️ **内容真写进存储层**（`storage/<assetId>/<versionId>/<path>` · `versions.ts:115` 同布局）——
//      diff 要比对**真实文件内容**（`version-compare.ts` 经 `storage.get` 读文本）；只插 `asset_file` 行不够。
//      （既有 `m4b4-seed-assets.ts` 不写存储 —— 它的 dogfood 只断「文件树结构」，不读内容。）
//
// 运行（**仓库根** —— env 在 `apps/server/.env`，根目录无 `.env`，故须显式 `--env-file`）：
//   SMOKE_M4B2_PASSWORD='<口令>' bun --env-file=apps/server/.env docs/smoke/scripts/m4b5-seed-reviews.ts
//
// 前置：① `DATABASE_URL` ② 首次写库须用户授权（批 design §9.6）
//
// 纪律（对齐 `m4b2-seed-roles.ts` / `m4b4-seed-assets.ts`）：
// - **幂等 · 可重放 · 零 delete**：全部「有则改、无则建」；重跑即把 dogfood 改过的行**复位**
//   （task 态 / 版本态 / 版本指针 / 文件内容与哈希）
// - **只碰本前缀**：`m4b5-seed-*` / `m4b5_owner` / `m4b5_member`；不清任何全表
// - 口令**只从 env 读**（`SMOKE_M4B2_PASSWORD`，与既有约定共用）—— 仓库内不落任何口令
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from '../../../apps/server/src/auth/better-auth.js';
import { createClient } from '../../../apps/server/src/db/client.js';
import type { AssetType, VersionStatus } from '../../../apps/server/src/db/schema/assets.js';
import type { ReviewStatus } from '../../../apps/server/src/db/schema/governance.js';
import {
  account,
  asset,
  assetFile,
  assetVersion,
  reviewTask,
  user,
} from '../../../apps/server/src/db/schema/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required（提示：bun --env-file=apps/server/.env …）');
  process.exit(1);
}
const password = process.env.SMOKE_M4B2_PASSWORD;
if (!password) {
  console.error('SMOKE_M4B2_PASSWORD is required（仓库内不落口令）');
  process.exit(1);
}

const ASSET_PREFIX = 'm4b5-seed-';
const OWNER_NAME = 'm4b5_owner';
const MEMBER_NAME = 'm4b5_member';
/**
 * 存储根：与 dev server 的 `STORAGE_DIR` 默认（`./storage`，CWD = `apps/server`）同址
 * ⇒ 从**仓库根**（本脚本的约定运行位置）解析（`import.meta.dir` 在 tsx file 下类型不可用）。
 */
const STORAGE_ROOT = path.resolve(process.cwd(), 'apps/server/storage');

const db = createClient(connectionString);

/* ── ① 账号（upsert：有则改口令/档位、无则建 —— 形态与官方写入路径一致） ── */
const passwordHash = await hashPassword(password);

async function ensureUser(username: string): Promise<string> {
  const found = await db.$client.query<{ id: string }>(
    'select id from "user" where username = $1',
    [username],
  );
  const existing = found.rows[0]?.id;
  const id = existing ?? `usr_${crypto.randomUUID()}`;
  if (existing) {
    await db.$client.query(
      `update "user"
          set name = $1, email = $2, email_verified = true, status = 'ACTIVE',
              role = 'user', username = $1, display_username = $1, updated_at = now()
        where id = $3`,
      [username, `${username}@local.test`, id],
    );
  } else {
    await db.insert(user).values({
      id,
      name: username,
      email: `${username}@local.test`,
      emailVerified: true,
      status: 'ACTIVE',
      role: 'user',
      username,
      displayUsername: username,
    });
  }
  const acc = await db.$client.query(
    `update account set password = $1, updated_at = now()
      where provider_id = 'credential' and account_id = $2 and user_id = $3`,
    [passwordHash, username, id],
  );
  if (!acc.rowCount) {
    await db.insert(account).values({
      id: `acc_${crypto.randomUUID()}`,
      providerId: 'credential',
      accountId: username,
      userId: id,
      password: passwordHash,
    });
  }
  console.log(`[seed] user ${username} ${existing ? 'updated' : 'created'}`);
  return id;
}

/** 既有账号引用（**不新建**）：不存在即抛 —— 管理档/超管沿用既有账号 */
async function requireUser(username: string): Promise<string> {
  const found = await db.$client.query<{ id: string }>(
    'select id from "user" where username = $1',
    [username],
  );
  const id = found.rows[0]?.id;
  if (!id) throw new Error(`账号不存在：${username}（先跑 m4b2-seed-roles.ts）`);
  return id;
}

const ownerId = await ensureUser(OWNER_NAME);
const memberId = await ensureUser(MEMBER_NAME);
const managerId = await requireUser('m4b2_mgr'); // 裁决者（既有管理档）

/* ── ② 资产 / 版本 / 文件 / task（全部 upsert） ── */
async function ensureAsset(
  suffix: string,
  type: AssetType,
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED',
  assetOwnerId: string,
): Promise<number> {
  const slug = `${ASSET_PREFIX}${suffix}`;
  const found = await db.$client.query<{ id: number }>('select id from asset where slug = $1', [
    slug,
  ]);
  const existing = found.rows[0];
  if (existing) {
    await db.$client.query(
      'update asset set owner_id = $1, status = $2, updated_by = $1, updated_at = now() where id = $3',
      [assetOwnerId, status, existing.id],
    );
    return existing.id;
  }
  const inserted = await db
    .insert(asset)
    .values({
      slug,
      type,
      ownerId: assetOwnerId,
      status,
      createdBy: assetOwnerId,
      updatedBy: assetOwnerId,
    })
    .returning({ id: asset.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert asset 未返回行：${slug}`);
  return created.id;
}

async function ensureVersion(
  assetId: number,
  version: string,
  versionStatus: VersionStatus,
  actorId: string,
  manifest: Record<string, unknown>,
): Promise<number> {
  const found = await db.$client.query<{ id: number }>(
    'select id from asset_version where asset_id = $1 and version = $2',
    [assetId, version],
  );
  const existing = found.rows[0];
  if (existing) {
    await db.$client.query(
      'update asset_version set status = $1, manifest_json = $2::jsonb, parsed_metadata_json = $3::jsonb where id = $4',
      [
        versionStatus,
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
      status: versionStatus,
      createdBy: actorId,
      fileCount: 0,
      manifestJson: manifest,
      parsedMetadataJson: { description: manifest.description ?? null },
    })
    .returning({ id: assetVersion.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert asset_version 未返回行：${assetId}/${version}`);
  return created.id;
}

/** 写**真实内容**进存储层 + upsert `asset_file` 行（`file_count` 与 `total_size` 一并回填） */
async function ensureFiles(
  assetId: number,
  versionId: number,
  files: Record<string, string>,
): Promise<void> {
  let total = 0;
  for (const [filePath, content] of Object.entries(files)) {
    const full = path.join(STORAGE_ROOT, String(assetId), String(versionId), filePath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content, 'utf8');
    const buf = Buffer.from(content, 'utf8');
    const sha256 = createHash('sha256').update(buf).digest('hex');
    total += buf.byteLength;
    const storageKey = `${assetId}/${versionId}/${filePath}`;
    const existing = await db.$client.query<{ id: number }>(
      'select id from asset_file where version_id = $1 and file_path = $2',
      [versionId, filePath],
    );
    if (existing.rows[0]) {
      await db.$client.query(
        'update asset_file set file_size = $1, sha256 = $2, storage_key = $3 where id = $4',
        [buf.byteLength, sha256, storageKey, existing.rows[0].id],
      );
    } else {
      await db.insert(assetFile).values({
        versionId,
        filePath,
        fileSize: buf.byteLength,
        contentType: filePath.endsWith('.md') ? 'text/markdown' : 'text/plain',
        sha256,
        storageKey,
      });
    }
  }
  await db.$client.query(
    'update asset_version set file_count = $1, total_size = $2 where id = $3',
    [Object.keys(files).length, total, versionId],
  );
}

/** task upsert（按 `(version, status)` 键 —— **零 delete**；PENDING 有 DB 唯一约束） */
async function ensureTask(
  versionId: number,
  taskStatus: ReviewStatus,
  submittedBy: string,
  opts: { comment?: string; reviewedBy?: string; reviewVersion?: number } = {},
): Promise<number> {
  const found = await db.$client.query<{ id: number }>(
    'select id from review_task where asset_version_id = $1 and status = $2',
    [versionId, taskStatus],
  );
  const existing = found.rows[0];
  const reviewedAt = taskStatus === 'PENDING' ? null : new Date();
  if (existing) {
    await db.$client.query(
      `update review_task
          set submitted_by = $1, review_comment = $2, reviewed_by = $3, reviewed_at = $4,
              version = $5, submitted_at = now()
        where id = $6`,
      [
        submittedBy,
        opts.comment ?? null,
        opts.reviewedBy ?? null,
        reviewedAt,
        opts.reviewVersion ?? 1,
        existing.id,
      ],
    );
    return existing.id;
  }
  const inserted = await db
    .insert(reviewTask)
    .values({
      assetVersionId: versionId,
      status: taskStatus,
      version: opts.reviewVersion ?? 1,
      submittedBy,
      reviewComment: opts.comment ?? null,
      reviewedBy: opts.reviewedBy ?? null,
      reviewedAt,
    })
    .returning({ id: reviewTask.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert review_task 未返回行：${versionId}/${taskStatus}`);
  return created.id;
}

const setLatest = async (assetId: number, versionId: number): Promise<void> => {
  await db.$client.query(
    'update asset set latest_version_id = $1, updated_at = now() where id = $2',
    [versionId, assetId],
  );
};

/* ── ③ fixture ①–⑥（§9.6） ── */
const SKILL_MD = [
  '# LangGraph RAG 检索技能（M4b-5 造数）',
  '',
  '审核面 fixture：用于三族形态实证与动作矩阵实测。',
  '',
  '## 用法',
  '',
  '```ts',
  "import { retrieve } from './index.js';",
  '```',
  '',
].join('\n');

const f1 = await ensureAsset('skill', 'skill', 'HIDDEN', ownerId);
const f1v = await ensureVersion(f1, '1.0.0', 'UPLOADED', ownerId, {
  name: 'm4b5-seed-skill',
  description: '审核面 skill 族 fixture（含 SKILL.md ⇒ 主文档分支）',
  'allowed-tools': ['Read', 'Bash'],
});
await ensureFiles(f1, f1v, {
  'SKILL.md': SKILL_MD,
  'references/guide.md': '# 指南\n\n要点若干。\n',
});
const t1 = await ensureTask(f1v, 'PENDING', memberId);

const f2 = await ensureAsset('mcp', 'mcp', 'HIDDEN', ownerId);
const f2v = await ensureVersion(f2, '1.0.0', 'UPLOADED', ownerId, {
  name: 'm4b5-seed-mcp',
  description: '审核面 mcp 族 fixture（servers 2 条 = stdio 1 + http 1 · 不造 README）',
  servers: {
    search: { type: 'stdio', command: 'node', args: ['server.js'], enabled: true },
    api: { type: 'http', url: 'https://mcp.example.invalid/mcp', enabled: true },
  },
});
// ⚠️ 刻意**不造 README.md**（§9.6 G-Q2：与 ③ 共同实证「无 README ⇒ manifest 回退」）
await ensureFiles(f2, f2v, {
  'mcp.json': '{"mcpServers":{}}\n',
  'server.js': 'export const start = () => {};\n',
});
const t2 = await ensureTask(f2v, 'PENDING', memberId);

const f3 = await ensureAsset('agent', 'agent', 'HIDDEN', ownerId);
const f3v = await ensureVersion(f3, '1.0.0', 'UPLOADED', ownerId, {
  name: 'm4b5-seed-agent',
  description: '审核面 agent 族 fixture（不造 README ⇒ 回退分支）',
  label: '数据分析助手',
  icon: 'chart',
  color: '#6f42c1',
  category: 'data',
  keywords: ['sql', '报表'],
  'x-aih-team': 'team-a',
});
await ensureFiles(f3, f3v, { 'agent.yaml': 'name: m4b5-seed-agent\n' });
const t3 = await ensureTask(f3v, 'PENDING', memberId);

const REJECT_COMMENT = '缺少最小复现用例与基准问句集，请补充后重新提交。';
const f4 = await ensureAsset('rejected', 'skill', 'HIDDEN', ownerId);
const f4v = await ensureVersion(f4, '1.0.0', 'REJECTED', memberId, {
  name: 'm4b5-seed-rejected',
  description: '审核面「已驳回」fixture（不可预览 + 驳回原因行）',
});
await ensureFiles(f4, f4v, { 'SKILL.md': '# 被驳回的技能\n' });
const t4 = await ensureTask(f4v, 'REJECTED', memberId, {
  comment: REJECT_COMMENT,
  reviewedBy: managerId,
});

const f5 = await ensureAsset('withdrawn', 'skill', 'HIDDEN', ownerId);
const f5v = await ensureVersion(f5, '1.0.0', 'UPLOADED', memberId, {
  name: 'm4b5-seed-withdrawn',
  description: '审核面「已撤回」fixture',
});
await ensureFiles(f5, f5v, { 'SKILL.md': '# 已撤回的提交\n' });
const t5 = await ensureTask(f5v, 'WITHDRAWN', memberId);

// ⑥ B1（**真语义**）：上传者 = `m4b5_owner`（owner 本人上传）· **提交人 = `m4b5_member`（代提）**
//     ⇒ 预览授权集 = 超管/管理档/owner/上传者 ⇒ 成员**既非 owner 也非上传者** ⇒ 预览 404（B1 成立）
const f6 = await ensureAsset('b1', 'skill', 'HIDDEN', ownerId);
const f6v = await ensureVersion(f6, '1.0.0', 'UPLOADED', ownerId, {
  name: 'm4b5-seed-b1',
  description: 'B1 边界 fixture（owner ≠ 提交人）',
});
await ensureFiles(f6, f6v, { 'SKILL.md': '# B1 边界\n' });
const t6 = await ensureTask(f6v, 'PENDING', memberId);

/* ── ④ fixture ⑦–⑧（F189 追加：变更对比两面） ── */
// ⑦ 可比态：v1.0.0 PUBLISHED（latest 指针落位）+ v1.1.0 UPLOADED ⇒ 详情出现变更对比卡（真实 patch）
const f7 = await ensureAsset('compare', 'skill', 'HIDDEN', ownerId);
const f7v1 = await ensureVersion(f7, '1.0.0', 'PUBLISHED', ownerId, {
  name: 'm4b5-seed-compare',
  description: '可比态 fixture v1.0.0（已发布）',
});
await ensureFiles(f7, f7v1, {
  'SKILL.md': ['# 对比技能', '', '## 用法', '', '旧写法。', ''].join('\n'),
});
await setLatest(f7, f7v1);
const f7v2 = await ensureVersion(f7, '1.1.0', 'UPLOADED', memberId, {
  name: 'm4b5-seed-compare',
  description: '可比态 fixture v1.1.0（待审）',
});
await ensureFiles(f7, f7v2, {
  'SKILL.md': [
    '# 对比技能',
    '',
    '## 用法',
    '',
    '新写法（v1.1 新增）。',
    '',
    '## 变更',
    '',
    '补充检索脚本。',
    '',
  ].join('\n'),
  'scripts/search.mjs': 'export const search = (q) => q;\n',
});
const t7 = await ensureTask(f7v2, 'PENDING', memberId);

// ⑧ 同版本重审：v1.0.0 已发布（latest 指向它）+ task 指向**同一版本** ⇒ 卡在场 + 空态（G10 ⑦）
const f8 = await ensureAsset('samever', 'skill', 'HIDDEN', ownerId);
const f8v = await ensureVersion(f8, '1.0.0', 'PUBLISHED', ownerId, {
  name: 'm4b5-seed-samever',
  description: '同版本重审 fixture（latest === 待审版本）',
});
await ensureFiles(f8, f8v, { 'SKILL.md': '# 同版本重审\n' });
await setLatest(f8, f8v);
const t8 = await ensureTask(f8v, 'PENDING', memberId);

// ⑨ **R2 核心**：提交人 = **管理档本人**（`m4b2_mgr`）⇒ 管理档自查视面（三动作照常渲染 · 含自审）
//    与 ⑩ **提交人非管理档 × PENDING**（用 ①/②/③/⑥ 以 `m4b5_member` 登录即可覆盖 ⇒ `adminOnly` 说明行）
const f9 = await ensureAsset('selfreview', 'skill', 'HIDDEN', managerId);
const f9v = await ensureVersion(f9, '1.0.0', 'UPLOADED', managerId, {
  name: 'm4b5-seed-selfreview',
  description: 'R2 fixture：提交人 = 管理档本人（可自审）',
});
await ensureFiles(f9, f9v, { 'SKILL.md': ['# 管理档自提', ''].join('\n') });
const t9 = await ensureTask(f9v, 'PENDING', managerId);

// ⑩–⑬ **动作专用 fixture**（G6 会真点三动作 ⇒ 每次用掉一条；与 G7/G8/G10 依赖的 fixture 隔离，
//      使分段跑（SMOKE_ONLY）与全量跑都不互相打翻；仍由 seed 幂等复位）
const acts: Record<string, number> = {};
for (const [suffix, desc] of [
  ['act-reject', 'G6 驳回用（管理档 × PENDING）'],
  ['act-approve', 'G6 通过用（管理档 × PENDING）'],
  ['act-withdraw', 'G6 撤回用（提交人 × PENDING）'],
  ['act-member', 'G7 adminOnly 说明行用（提交人非管理档 × PENDING）'],
] as const) {
  const aid = await ensureAsset(suffix, 'skill', 'HIDDEN', ownerId);
  const av = await ensureVersion(aid, '1.0.0', 'UPLOADED', memberId, {
    name: `m4b5-seed-${suffix}`,
    description: desc,
  });
  await ensureFiles(aid, av, { 'SKILL.md': [`# ${suffix}`, '', desc, ''].join('\n') });
  acts[suffix] = await ensureTask(av, 'PENDING', memberId);
}

console.log('\n[seed] fixture task（供 dogfood / 手验使用）：');
console.log(`  ① skill      task #${t1}  → /reviews/${t1}`);
console.log(`  ② mcp        task #${t2}  → /reviews/${t2}`);
console.log(`  ③ agent      task #${t3}  → /reviews/${t3}`);
console.log(`  ④ rejected   task #${t4}  → /reviews/${t4}`);
console.log(`  ⑤ withdrawn  task #${t5}  → /reviews/${t5}`);
console.log(`  ⑥ b1         task #${t6}  → /reviews/${t6}`);
console.log(`  ⑦ compare    task #${t7}  → /reviews/${t7}（可比态）`);
console.log(`  ⑧ samever    task #${t8}  → /reviews/${t8}（同版本重审）`);
console.log(`  ⑨ selfreview task #${t9}  → /reviews/${t9}（R2：提交人=管理档本人 ⇒ 可自审）`);
for (const [k, v] of Object.entries(acts))
  console.log(`  · ${k.padEnd(12)} task #${v}  → /reviews/${v}（G6/G7 动作专用）`);
console.log(`\n[seed] 存储根：${STORAGE_ROOT}`);
process.exit(0);
