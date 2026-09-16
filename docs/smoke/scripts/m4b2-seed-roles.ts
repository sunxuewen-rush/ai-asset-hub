// M4b-2 多角色种子（可重放——批 design §9.5 · Q11/Q19）
//
// 用途：建/重置 3 个本地测试账号，供 dogfood / 观感验收的四档侧栏显隐与守卫实测使用：
//   m4b2_super → role=superadmin(100) · m4b2_mgr → role=admin(10) · m4b2_user → role=user(1)
//
// 运行（**仓库根**——env 在 `apps/server/.env`，根目录无 `.env`，故须显式 `--env-file`）：
//   SMOKE_M4B2_PASSWORD='<口令>' bun --env-file=apps/server/.env docs/smoke/scripts/m4b2-seed-roles.ts
//
// 前置：**只需 `DATABASE_URL`**（与 `db:migrate` / `db:seed` 同约定，不需全量 env）。
//
// **形态 = upsert（2026-09-16 T6 修正）**——原形态「删 `session` → `account` → `user` 后重建」
// 在 `audit_log.actor_id` 有行时**恒 23503 外键违反**（实测引用 `"user"` 的外键 = **12 约束 / 9 张表**：
// account · asset×3 · asset_label · asset_version×2 · audit_log · label_definition · review_task×2 · session；
// T3 落脚本时只清了 `session`/`account`，T4 实测登录产生 8 条审计行后暴露）。现形态：
// - ① **只清 `session`**（本前缀用户）——改口令后旧会话必须失效（安全面）
// - ② `user` / `account` 走 **有则改、无则建**：`user` 行**永不删除** ⇒ 9 张引用表**全都不需清理**
//   （把 FK 触发器**根除**，而非逐个补漏）；且 **`user.id` 恒定** ⇒ 既有 `audit_log` 等引用
//   继续指向同一用户（审计留痕不丢——删审计日志属治理底线范围）
// - ③ 冷库首跑与旧形态**逐字段等价**（同 `usr_`/`acc_` 前缀 · 同合成邮箱 · 同 `hashPassword`）
//
// 已知边界：账号**改名**不在本脚本能力内（无删除面）——改名需手工清理旧行。
//
// 纪律（Q19 / §9.5）：
// - 口令**只从 env 读**（单一变量 `SMOKE_M4B2_PASSWORD`，三账号共用）——**仓库内不落任何口令**
// - **禁全表 `delete`**：会话清理按 `username` 前缀 `m4b2_` 筛**子集**（可重放）
// - 写入形态与官方登录路径一致（同 `apps/server/src/db/seed.ts`）：口令用官方同一 scrypt 实现
//   (`hashPassword`)；凭据行 `provider_id='credential'` + `account_id=` 登录名；合成邮箱
//   `<username>@local.test` 与 `SEED_ADMIN_EMAIL` 默认值同源（R13 合成点约定）
// - **不直接 import `drizzle-orm`**：本文件位于 `docs/`（非 workspace 包），依赖只能从
//   `apps/server/node_modules` 解析 ⇒ 读/改/清走 `$client` 原生 SQL，`insert` 走 schema 表对象
//   （二者都经 `apps/server/src/**` 间接解析，不受本文件位置影响）
import { hashPassword } from '../../../apps/server/src/auth/better-auth.js';
import { createClient } from '../../../apps/server/src/db/client.js';
import { account, user } from '../../../apps/server/src/db/schema/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required（提示：bun --env-file=apps/server/.env …）');
  process.exit(1);
}
const password = process.env.SMOKE_M4B2_PASSWORD;
if (!password) {
  console.error('SMOKE_M4B2_PASSWORD is required（三账号共用；仓库内不落口令）');
  process.exit(1);
}

/** 账号前缀（筛选与建号共用 ⇒ 可重放） */
const PREFIX = 'm4b2_';
const ACCOUNTS = [
  { username: `${PREFIX}super`, role: 'superadmin' },
  { username: `${PREFIX}mgr`, role: 'admin' },
  { username: `${PREFIX}user`, role: 'user' },
] as const;

const db = createClient(connectionString);

// ① 既有账号（**只读其 id 以复用**——`user` 行不删）——`"user"` 是 SQL 保留字，须加引号
const existing = await db.$client.query<{ id: string; username: string }>(
  'select id, username from "user" where username like $1',
  [`${PREFIX}%`],
);
const idByUsername = new Map(existing.rows.map((row) => [row.username, row.id]));

// ② 清会话子集（改口令后旧会话必须失效；**不触 user/account ⇒ 不触发任何 FK**）
if (existing.rows.length > 0) {
  const cleared = await db.$client.query('delete from session where user_id = any($1)', [
    existing.rows.map((row) => row.id),
  ]);
  console.log(`[seed] cleared ${cleared.rowCount ?? 0} session(s)`);
}

// ③ upsert：有则改、无则建（**无删除面** ⇒ 引用表无需清理）
for (const { username, role } of ACCOUNTS) {
  const email = `${username}@local.test`;
  const passwordHash = await hashPassword(password);
  const currentId = idByUsername.get(username);

  if (currentId) {
    // 有则改：role/status/资料回约定值 + 口令刷新（`updated_at` 须显式写——原生 SQL 不触发 `$onUpdate`）
    await db.$client.query(
      `update "user"
          set name = $1, email = $2, email_verified = true, status = 'ACTIVE',
              role = $3, username = $1, display_username = $1, updated_at = now()
        where id = $4`,
      [username, email, role, currentId],
    );
    const updated = await db.$client.query(
      `update account
          set password = $1, updated_at = now()
        where provider_id = 'credential' and account_id = $2 and user_id = $3`,
      [passwordHash, username, currentId],
    );
    if (updated.rowCount && updated.rowCount > 0) {
      console.log(`[seed] ${username} updated (role=${role}, password reset)`);
    } else {
      // 凭据行缺失（如被历史清理删除）⇒ 补建，保持账号可用
      await db.insert(account).values({
        id: `acc_${crypto.randomUUID()}`,
        providerId: 'credential',
        accountId: username,
        userId: currentId,
        password: passwordHash,
      });
      console.log(`[seed] ${username} credential re-created (role=${role}, password set)`);
    }
  } else {
    // 无则建（user + 凭据 account 同一事务，形态与官方写入路径一致）
    const userId = `usr_${crypto.randomUUID()}`;
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name: username,
        email,
        emailVerified: true,
        status: 'ACTIVE',
        role,
        username,
        displayUsername: username,
      });
      await tx.insert(account).values({
        id: `acc_${crypto.randomUUID()}`,
        providerId: 'credential',
        accountId: username,
        userId,
        password: passwordHash,
      });
    });
    console.log(`[seed] ${username} created (role=${role}, status=ACTIVE)`);
  }
}

console.log(`[seed] done — ${ACCOUNTS.length} accounts ready`);
await db.$client.end();
