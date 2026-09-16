// M4b-3 提交面造数（可重放 —— 批 design §9「G3/G4/G6 需要可重放的数据构造」· 批 plan T10）
//
// 用途：给目标账号造出「我的提交」页需要覆盖的真实数据（列渲染 + 撤回成功链 + 拒绝原因列）：
//   · `m4b3-seed-skill` 1.0.0 → asset_version `PENDING_REVIEW` + review_task **PENDING**（可被撤回）
//   · `m4b3-seed-skill` 0.9.0 → asset_version `REJECTED`      + review_task **REJECTED**（带 `review_comment`）
//   · `m4b3-seed-mcp`   2.1.0 → asset_version `UPLOADED`      + review_task **WITHDRAWN**（类型列出现 MCP）
//
// 运行（**仓库根** —— env 在 `apps/server/.env`，根目录无 `.env`，故须显式 `--env-file`）：
//   bun --env-file=apps/server/.env docs/smoke/scripts/m4b3-seed-submissions.ts
//   可选：`SMOKE_TARGET_USERNAME=<账号>`（默认 `m4b2_user`）
//
// 前置：**只需 `DATABASE_URL`**（与 `db:migrate` / `db:seed` 同约定）；目标账号须已存在
//   （先跑 `docs/smoke/scripts/m4b2-seed-roles.ts`）。
//
// 纪律（对齐 `m4b2-seed-roles.ts`）：
// - **幂等且可重放**：全部走「有则改、无则建」的 upsert —— **零 `delete`**（含禁全表 delete）；
//   重跑即把被 dogfood 改过的行**复位**（如撤回后 PENDING → WITHDRAWN，重跑回 PENDING）⇒ dogfood 可反复跑。
// - **只碰本前缀**：资产 `slug like 'm4b3-seed-%'`；不触碰其它账号/其它资产生成的行。
// - 不直接 import `drizzle-orm`（本文件在 `docs/` 非 workspace 包）：读/改走 `$client` 原生 SQL，
//   插入走 schema 表对象（二者都经 `apps/server/src/**` 解析）。
import { createClient } from '../../../apps/server/src/db/client.js';
import type { VersionStatus } from '../../../apps/server/src/db/schema/assets.js';
import { asset, assetVersion, reviewTask } from '../../../apps/server/src/db/schema/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required（提示：bun --env-file=apps/server/.env …）');
  process.exit(1);
}
const targetUsername = process.env.SMOKE_TARGET_USERNAME ?? 'm4b2_user';

/** 造数规格（slug 前缀固定 → 可重放；三行覆盖三种状态 + 两种类型） */
const SPECS = [
  {
    slug: 'm4b3-seed-skill',
    type: 'skill',
    version: '1.0.0',
    versionStatus: 'PENDING_REVIEW',
    taskStatus: 'PENDING',
    reviewComment: null,
  },
  {
    slug: 'm4b3-seed-skill',
    type: 'skill',
    version: '0.9.0',
    versionStatus: 'REJECTED',
    taskStatus: 'REJECTED',
    reviewComment:
      '缺少 SKILL.md 根级主文件，且 meta.json 的 version 与目录名不一致，请修正后重新提交。',
  },
  {
    slug: 'm4b3-seed-mcp',
    type: 'mcp',
    version: '2.1.0',
    versionStatus: 'UPLOADED',
    taskStatus: 'WITHDRAWN',
    reviewComment: null,
  },
] as const;

const db = createClient(connectionString);

// ① 目标账号（必须已存在——不建号，避免与本脚本职责外的东西耦合）
const users = await db.$client.query<{ id: string }>('select id from "user" where username = $1', [
  targetUsername,
]);
const ownerId = users.rows[0]?.id;
if (!ownerId) {
  console.error(`目标账号不存在：${targetUsername}（先跑 m4b2-seed-roles.ts）`);
  process.exit(1);
}

// ② 资产（按 slug upsert；`uq_asset_slug` 全局唯一）
async function ensureAsset(slug: string, type: 'skill' | 'mcp' | 'agent'): Promise<number> {
  const found = await db.$client.query<{ id: number }>('select id from asset where slug = $1', [
    slug,
  ]);
  const existing = found.rows[0];
  if (existing) {
    await db.$client.query('update asset set owner_id = $1, updated_by = $1 where id = $2', [
      ownerId,
      existing.id,
    ]);
    return existing.id;
  }
  const inserted = await db
    .insert(asset)
    .values({ slug, type, ownerId, status: 'ACTIVE', createdBy: ownerId, updatedBy: ownerId })
    .returning({ id: asset.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert asset 未返回行：${slug}`);
  return created.id;
}

// ③ 版本（按 (asset_id, version) upsert；`uq_asset_version_asset_version`）
async function ensureVersion(
  assetId: number,
  version: string,
  versionStatus: VersionStatus,
): Promise<number> {
  const found = await db.$client.query<{ id: number }>(
    'select id from asset_version where asset_id = $1 and version = $2',
    [assetId, version],
  );
  const existing = found.rows[0];
  if (existing) {
    await db.$client.query('update asset_version set status = $1 where id = $2', [
      versionStatus,
      existing.id,
    ]);
    return existing.id;
  }
  const inserted = await db
    .insert(assetVersion)
    .values({ assetId, version, status: versionStatus, createdBy: ownerId, fileCount: 0 })
    .returning({ id: assetVersion.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert asset_version 未返回行：${assetId}/${version}`);
  return created.id;
}

// ④ 审核任务（按 asset_version_id upsert —— **一行一版本**；`uq_review_task_version_pending` 保证 PENDING 唯一）
async function ensureTask(
  versionId: number,
  taskStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN',
  reviewComment: string | null,
): Promise<void> {
  const found = await db.$client.query<{ id: number }>(
    'select id from review_task where asset_version_id = $1',
    [versionId],
  );
  const existing = found.rows[0];
  if (existing) {
    await db.$client.query(
      'update review_task set status = $1, review_comment = $2, submitted_by = $3 where id = $4',
      [taskStatus, reviewComment, ownerId, existing.id],
    );
    return;
  }
  await db.insert(reviewTask).values({
    assetVersionId: versionId,
    status: taskStatus,
    version: 1,
    submittedBy: ownerId,
    reviewComment,
  });
}

const summary: string[] = [];
for (const spec of SPECS) {
  const assetId = await ensureAsset(spec.slug, spec.type);
  const versionId = await ensureVersion(assetId, spec.version, spec.versionStatus);
  await ensureTask(versionId, spec.taskStatus, spec.reviewComment);
  summary.push(
    `  ${spec.slug}@${spec.version}  version=${spec.versionStatus}  task=${spec.taskStatus}`,
  );
}

console.log(`M4b-3 造数完成（账号 ${targetUsername}）：`);
console.log(summary.join('\n'));
console.log('重跑即复位（撤回后再跑 ⇒ PENDING 复位）。');
process.exit(0);
