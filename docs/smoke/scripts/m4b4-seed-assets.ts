// M4b-4 个人面 B 造数（可重放 · 批 design §9.5 · 批 plan T11 步骤 1）
//
// 用途：造出 G1–G19 需要的四档会话 + 三态资产 + 版本态 + 标签 + star 数据：
//   账号  m4b2_user（owner · role=user）· m4b2_mgr（管理档 · admin）· m4b2_super（超管 · superadmin）
//         · **m4b4_outsider**（本脚本新建 · role=user · 「登录非 owner」档 —— G5/G11 需要）
//   资产  owner（m4b2_user）名下：
//           m4b4-seed-skill  skill  **ACTIVE**   版本 1.0.0 PUBLISHED(latest) / 0.9.0 DRAFT /
//                                                     0.8.0 REJECTED / 0.7.0 UPLOADED
//           m4b4-seed-mcp    mcp    **HIDDEN**   版本 0.1.0 DRAFT
//           m4b4-seed-agent  agent  **ARCHIVED** 版本 0.2.0 DRAFT
//         他人（m4b2_mgr）名下：m4b4-seed-other skill **ACTIVE** 版本 1.0.0 PUBLISHED  ← G5 owner-only 反证
//   标签  `agentic`（既有 RECOMMENDED）+ `m4b4-seed-privileged`（本脚本建 · **PRIVILEGED**）
//         ⇒ 两条都挂到 m4b4-seed-skill（G9 chips 文案 / G11 非超管 × 禁用）
//   star  m4b2_mgr 收藏 m4b4-seed-skill ⇒ owner 看 `starCount=1` 且 `starredByMe=false`（G16 对照）
//         m4b2_user 收藏 m4b4-seed-other ⇒ owner 看 `starredByMe=true`（G16 正证）
//
// 运行（**仓库根** —— env 在 `apps/server/.env`，根目录无 `.env`，故须显式 `--env-file`）：
//   SMOKE_M4B2_PASSWORD='<口令>' bun --env-file=apps/server/.env docs/smoke/scripts/m4b4-seed-assets.ts
//
// 前置：① `DATABASE_URL`（与 `db:migrate` / `db:seed` 同约定）
//       ② 三个 m4b2 账号已存在（先跑 `docs/smoke/scripts/m4b2-seed-roles.ts`）
//       ③ **首次写库须用户授权**（批 design §9.5）
//
// 纪律（对齐 `m4b2-seed-roles.ts` / `m4b3-seed-submissions.ts`）：
// - **幂等 · 可重放 · 零 `delete`**：全部「有则改、无则建」；重跑即把 dogfood 改过的行**复位**
//   （如 star 被取消 ⇒ 重跑回 1；状态治理改过的 status ⇒ 回约定值）
// - **只碰本前缀**：`m4b4-seed-*` / `m4b4_outsider`；不清任何全表
// - 口令**只从 env 读**（`SMOKE_M4B2_PASSWORD`，四账号共用）—— 仓库内不落任何口令
// - 不直接 import `drizzle-orm`（本文件在 `docs/`，非 workspace 包）：读/改走 `$client` 原生 SQL，
//   插入走 schema 表对象（二者都经 `apps/server/src/**` 解析）
import { hashPassword } from '../../../apps/server/src/auth/better-auth.js';
import { createClient } from '../../../apps/server/src/db/client.js';
import type { VersionStatus } from '../../../apps/server/src/db/schema/assets.js';
import {
  account,
  asset,
  assetLabel,
  assetStar,
  assetVersion,
  labelDefinition,
  labelTranslation,
  user,
} from '../../../apps/server/src/db/schema/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required（提示：bun --env-file=apps/server/.env …）');
  process.exit(1);
}
const password = process.env.SMOKE_M4B2_PASSWORD;
if (!password) {
  console.error('SMOKE_M4B2_PASSWORD is required（四账号共用；仓库内不落口令）');
  process.exit(1);
}

/** 造数前缀（筛选与建号共用 ⇒ 可重放） */
const ASSET_PREFIX = 'm4b4-seed-';
const OUTSIDER = 'm4b4_outsider';
const OWNER = process.env.SMOKE_TARGET_USERNAME ?? 'm4b2_user';
const MANAGER = 'm4b2_mgr';
const SUPER = 'm4b2_super';

const db = createClient(connectionString);

/* ── ① 账号：三个 m4b2 档位账号（必须已存在）+ 本批 outsider（upsert） ── */
async function userIdOf(username: string): Promise<string> {
  const rows = await db.$client.query<{ id: string }>('select id from "user" where username = $1', [
    username,
  ]);
  const id = rows.rows[0]?.id;
  if (!id) throw new Error(`账号不存在：${username}（先跑 m4b2-seed-roles.ts）`);
  return id;
}

const ownerId = await userIdOf(OWNER);
const managerId = await userIdOf(MANAGER);
await userIdOf(SUPER); // 存在性校验（G11 超管档）

// outsider：有则改（口令刷新 + 档位回 user）、无则建 —— 形态与官方写入路径一致
const passwordHash = await hashPassword(password);
const outsiderRows = await db.$client.query<{ id: string }>(
  'select id from "user" where username = $1',
  [OUTSIDER],
);
const outsiderExisting = outsiderRows.rows[0]?.id;
if (outsiderExisting) {
  await db.$client.query(
    `update "user"
        set name = $1, email = $2, email_verified = true, status = 'ACTIVE',
            role = 'user', username = $1, display_username = $1, updated_at = now()
      where id = $3`,
    [OUTSIDER, `${OUTSIDER}@local.test`, outsiderExisting],
  );
  const updated = await db.$client.query(
    `update account set password = $1, updated_at = now()
      where provider_id = 'credential' and account_id = $2 and user_id = $3`,
    [passwordHash, OUTSIDER, outsiderExisting],
  );
  if (!updated.rowCount) {
    await db.insert(account).values({
      id: `acc_${crypto.randomUUID()}`,
      providerId: 'credential',
      accountId: OUTSIDER,
      userId: outsiderExisting,
      password: passwordHash,
    });
  }
  console.log(`[seed] ${OUTSIDER} updated (role=user, password reset)`);
} else {
  const outsiderId = `usr_${crypto.randomUUID()}`;
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: outsiderId,
      name: OUTSIDER,
      email: `${OUTSIDER}@local.test`,
      emailVerified: true,
      status: 'ACTIVE',
      role: 'user',
      username: OUTSIDER,
      displayUsername: OUTSIDER,
    });
    await tx.insert(account).values({
      id: `acc_${crypto.randomUUID()}`,
      providerId: 'credential',
      accountId: OUTSIDER,
      userId: outsiderId,
      password: passwordHash,
    });
  });
  console.log(`[seed] ${OUTSIDER} created (role=user, status=ACTIVE)`);
}

/* ── ② 资产 + 版本（按 slug / (asset,version) upsert） ── */
async function ensureAsset(
  slugSuffix: string,
  type: 'skill' | 'mcp' | 'agent',
  status: 'ACTIVE' | 'HIDDEN' | 'ARCHIVED',
  assetOwnerId: string,
): Promise<number> {
  const slug = `${ASSET_PREFIX}${slugSuffix}`;
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
    .values({ assetId, version, status: versionStatus, createdBy: actorId, fileCount: 0 })
    .returning({ id: assetVersion.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert asset_version 未返回行：${assetId}/${version}`);
  return created.id;
}

/** latest 投影（详情页下载按钮与 latest 徽章依赖它） */
async function setLatest(assetId: number, versionId: number): Promise<void> {
  await db.$client.query('update asset set latest_version_id = $1 where id = $2', [
    versionId,
    assetId,
  ]);
}

const skillId = await ensureAsset('skill', 'skill', 'ACTIVE', ownerId);
const skillPublished = await ensureVersion(skillId, '1.0.0', 'PUBLISHED', ownerId);
await ensureVersion(skillId, '0.9.0', 'DRAFT', ownerId);
await ensureVersion(skillId, '0.8.0', 'REJECTED', ownerId);
await ensureVersion(skillId, '0.7.0', 'UPLOADED', ownerId);
await setLatest(skillId, skillPublished);

const mcpId = await ensureAsset('mcp', 'mcp', 'HIDDEN', ownerId);
await ensureVersion(mcpId, '0.1.0', 'DRAFT', ownerId);

const agentId = await ensureAsset('agent', 'agent', 'ARCHIVED', ownerId);
await ensureVersion(agentId, '0.2.0', 'DRAFT', ownerId);

// 他人（管理档）名下 ACTIVE 资产 —— G5「owner-only 集合」的反证物
const otherId = await ensureAsset('other', 'skill', 'ACTIVE', managerId);
const otherPublished = await ensureVersion(otherId, '1.0.0', 'PUBLISHED', managerId);
await setLatest(otherId, otherPublished);

/* ── ③ 标签：PRIVILEGED 新定义（含 zh/en 译名）+ 两条挂载 ── */
async function ensureLabel(slug: string, type: 'RECOMMENDED' | 'PRIVILEGED'): Promise<number> {
  const found = await db.$client.query<{ id: number }>(
    'select id from label_definition where slug = $1',
    [slug],
  );
  const existing = found.rows[0];
  if (existing) {
    await db.$client.query(
      'update label_definition set type = $1, visible_in_filter = $2, updated_at = now() where id = $3',
      [type, type === 'RECOMMENDED', existing.id],
    );
    return existing.id;
  }
  const inserted = await db
    .insert(labelDefinition)
    .values({ slug, type, visibleInFilter: type === 'RECOMMENDED', createdBy: ownerId })
    .returning({ id: labelDefinition.id });
  const created = inserted[0];
  if (!created) throw new Error(`insert label_definition 未返回行：${slug}`);
  for (const [locale, displayName] of [
    ['zh-CN', '特权示例'],
    ['en', 'Privileged sample'],
  ] as const) {
    const has = await db.$client.query<{ id: number }>(
      'select id from label_translation where label_id = $1 and locale = $2',
      [created.id, locale],
    );
    if (has.rows[0]) {
      await db.$client.query(
        'update label_translation set display_name = $1, updated_at = now() where id = $2',
        [displayName, has.rows[0].id],
      );
      continue;
    }
    await db.insert(labelTranslation).values({ labelId: created.id, locale, displayName });
  }
  return created.id;
}

const labelAgentic = await ensureLabel('agentic', 'RECOMMENDED');
const labelPrivileged = await ensureLabel(`${ASSET_PREFIX}privileged`, 'PRIVILEGED');

async function ensureAttached(assetId: number, labelId: number, actorId: string): Promise<void> {
  const found = await db.$client.query<{ id: number }>(
    'select id from asset_label where asset_id = $1 and label_id = $2',
    [assetId, labelId],
  );
  if (found.rows[0]) {
    await db.$client.query('update asset_label set created_by = $1 where id = $2', [
      actorId,
      found.rows[0].id,
    ]);
    return;
  }
  await db.insert(assetLabel).values({ assetId, labelId, createdBy: actorId });
}

await ensureAttached(skillId, labelAgentic, ownerId);
await ensureAttached(skillId, labelPrivileged, ownerId);

/* ── ④ star：他人收藏（starredByMe=false 对照）+ owner 自收藏（正证） ── */
async function ensureStar(assetId: number, starUserId: string): Promise<void> {
  const found = await db.$client.query<{ id: number }>(
    'select id from asset_star where asset_id = $1 and user_id = $2',
    [assetId, starUserId],
  );
  if (found.rows[0]) return;
  await db.insert(assetStar).values({ assetId, userId: starUserId });
}

await ensureStar(skillId, managerId); // 他人（mgr）收藏 owner 资产
await ensureStar(otherId, ownerId); // owner 收藏他人资产

// 计数列与关系表对齐（**不 ±1**：以关系表为准重算 ⇒ 重跑幂等、不漂移）
for (const assetId of [skillId, mcpId, agentId, otherId]) {
  await db.$client.query(
    'update asset set star_count = (select count(*) from asset_star where asset_id = $1) where id = $1',
    [assetId],
  );
}

const summary = await db.$client.query<{ slug: string; status: string; star_count: number }>(
  `select slug, status, star_count from asset where slug like $1 order by slug`,
  [`${ASSET_PREFIX}%`],
);
console.log('M4b-4 造数完成（4 账号 / 4 资产 / 6 版本 / 2 标签挂载 / 2 star）：');
for (const row of summary.rows) {
  console.log(`  ${row.slug}  status=${row.status}  star_count=${row.star_count}`);
}
console.log('重跑即复位（dogfood 改过的行回到约定值）。');
await db.$client.end();
process.exit(0);
