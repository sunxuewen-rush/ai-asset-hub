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
//   分页占位（T11-e 新增 · 21 条 `m4b4-seed-page-01`…`-21` · **类型 mcp** · owner = m4b2_mgr · ACTIVE
//         · 各带 PUBLISHED 版本）⇒ `/mcps` 总数 2 → 23（> `PAGE_SIZE` 20）⇒ 门户出现第二页，
//         供「翻页不改视图」断言使用。
//     ⚠️ **不用 skill 类型**：`/skills` 的 ACTIVE 计数被 `m4a-dogfood` 两条断言依赖
//         （「资产数 < limit ⇒ 无分页控件」+「首屏含 LangGraph 卡片」，`m4a-dogfood.ts:346` 区）
//         —— 加 21 条 skill 即打翻既有基线。
//     ⚠️ **不挂 `m4b2_user` 名下**：`我的资产` 的 3 行断言（G5/G6）会被污染。
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
  /**
   * 版本展示描述 —— 写入 `asset_version.parsed_metadata_json.description`。
   * ⚠️ 卡片/列表/搜索的「描述」**不是版本表列**，而是该 jsonb 投影（`assets/service.ts:104` 读
   * `parsed_metadata_json->>'description'`；搜索面 `:205` 亦用它）⇒ 不写这里，卡片描述恒为空。
   */
  description: string,
): Promise<number> {
  // ⚠️ **不写 `name`**：`latestName` 会直接当卡片标题用（`AssetCard` 取 `latestName ?? slug`）——
  // 曾误写 `name: 版本号` 导致卡片标题变成「1.0.0」（2026-09-18 实测抓到，已修）
  const meta = { description };
  const found = await db.$client.query<{ id: number }>(
    'select id from asset_version where asset_id = $1 and version = $2',
    [assetId, version],
  );
  const existing = found.rows[0];
  if (existing) {
    // 重跑即复位：状态与描述一并回到约定值（`$2::jsonb` 显式转型——否则 text→jsonb 报类型错）
    await db.$client.query(
      'update asset_version set status = $1, parsed_metadata_json = $2::jsonb where id = $3',
      [versionStatus, JSON.stringify(meta), existing.id],
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
      parsedMetadataJson: meta,
    })
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

/**
 * 描述文案（用户 2026-09-18「给资产加一些描述信息，我看一下效果」）：**刻意做出长度差异**，
 * 便于在门户卡（描述区 = 3 行 ≈ 72px）上对比「填满 / 两行 / 一行 / 被截断」四种观感。
 */
const DESC = {
  /** 长（≈5 行 ⇒ 卡片上**被截断**，测 `line-clamp-3`） */
  skillLong:
    '面向企业知识库场景的检索增强生成技能：内置文档切分、向量化召回与交叉编码器重排三段流水线，支持增量索引与多租户隔离；' +
    '附带评测脚本与 12 组基准问句，可直接接入现有向量库与 LLM 网关，无需改动业务代码。',
  /** 中（≈2 行 ⇒ 描述区留一行空白） */
  otherMedium:
    '内部使用的发布检查助手：校验 SKILL.md 元数据完整性、包布局与版本号规范，并生成可直接粘贴的发布单。',
  /** 短（1 行） */
  skillDraft: '增量索引实验版（未发布）——仅供内部评测。',
  skillRejected: '首次提交被驳回：缺少基准问句集与最小复现用例。',
  skillUploaded: '初版骨架（占位）。',
  mcpDraft: 'HTTP MCP Server 示例：暴露 3 个工具（搜索 / 取详情 / 打分）。',
  agentDraft: '示例 Agent 定义：两段式规划 + 工具调用编排。',
} as const;

const skillId = await ensureAsset('skill', 'skill', 'ACTIVE', ownerId);
const skillPublished = await ensureVersion(skillId, '1.0.0', 'PUBLISHED', ownerId, DESC.skillLong);
await ensureVersion(skillId, '0.9.0', 'DRAFT', ownerId, DESC.skillDraft);
await ensureVersion(skillId, '0.8.0', 'REJECTED', ownerId, DESC.skillRejected);
await ensureVersion(skillId, '0.7.0', 'UPLOADED', ownerId, DESC.skillUploaded);
await setLatest(skillId, skillPublished);

const mcpId = await ensureAsset('mcp', 'mcp', 'HIDDEN', ownerId);
await ensureVersion(mcpId, '0.1.0', 'DRAFT', ownerId, DESC.mcpDraft);

const agentId = await ensureAsset('agent', 'agent', 'ARCHIVED', ownerId);
await ensureVersion(agentId, '0.2.0', 'DRAFT', ownerId, DESC.agentDraft);

// 他人（管理档）名下 ACTIVE 资产 —— G5「owner-only 集合」的反证物
const otherId = await ensureAsset('other', 'skill', 'ACTIVE', managerId);
const otherPublished = await ensureVersion(
  otherId,
  '1.0.0',
  'PUBLISHED',
  managerId,
  DESC.otherMedium,
);
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

/* ── ⑤ 分页占位（T11-e · 门户视图切换的翻页断言）：21 条 ACTIVE mcp ⇒ `/mcps` 23 条 > 20 ── */
const PAGE_ASSET_COUNT = 21;
for (let i = 1; i <= PAGE_ASSET_COUNT; i += 1) {
  const suffix = `page-${String(i).padStart(2, '0')}`;
  const pageAssetId = await ensureAsset(suffix, 'mcp', 'ACTIVE', managerId);
  const pageVersion = await ensureVersion(
    pageAssetId,
    '0.1.0',
    'PUBLISHED',
    managerId,
    `分页验证占位 #${i}：用于门户列表翻页与视图切换断言（不参与其余断言）。`,
  );
  await setLatest(pageAssetId, pageVersion);
}

const summary = await db.$client.query<{ slug: string; status: string; star_count: number }>(
  `select slug, status, star_count from asset where slug like $1 order by slug`,
  [`${ASSET_PREFIX}%`],
);
console.log(
  `M4b-4 造数完成（4 账号 / 4 资产 / 6 版本 / 2 标签挂载 / 2 star / ${PAGE_ASSET_COUNT} 条分页占位 mcp）：`,
);
for (const row of summary.rows) {
  console.log(`  ${row.slug}  status=${row.status}  star_count=${row.star_count}`);
}
console.log('重跑即复位（dogfood 改过的行回到约定值）。');
await db.$client.end();
process.exit(0);
