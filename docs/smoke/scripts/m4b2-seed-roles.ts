// M4b-2 多角色种子（可重放——批 design §9.5 · Q11/Q19）
//
// 用途：建 3 个本地测试账号，供 dogfood / 观感验收的四档侧栏显隐与守卫实测使用：
//   m4b2_super → role=superadmin(100) · m4b2_mgr → role=admin(10) · m4b2_user → role=user(1)
//
// 运行（**仓库根**——env 在 `apps/server/.env`，根目录无 `.env`，故须显式 `--env-file`）：
//   SMOKE_M4B2_PASSWORD='<口令>' bun --env-file=apps/server/.env docs/smoke/scripts/m4b2-seed-roles.ts
//
// 前置：**只需 `DATABASE_URL`**（与 `db:migrate` / `db:seed` 同约定，不需全量 env）。
//
// 纪律（Q19 / §9.5）：
// - 口令**只从 env 读**（单一变量 `SMOKE_M4B2_PASSWORD`，三账号共用）——**仓库内不落任何口令**
// - **禁全表 `delete`**：清理按 `username` 前缀 `m4b2_` 筛**子集**（可重放），顺序 session → account → user
//   （官方 `session`/`account` 对 `user` 有外键，须先删依赖行）
// - 写入形态与官方登录路径一致（同 `apps/server/src/db/seed.ts`）：口令用官方同一 scrypt 实现
//   (`hashPassword`)；凭据行 `provider_id='credential'` + `account_id=` 登录名；合成邮箱
//   `<username>@local.test` 与 `SEED_ADMIN_EMAIL` 默认值同源（R13 合成点约定）
// - **不直接 import `drizzle-orm`**：本文件位于 `docs/`（非 workspace 包），依赖只能从
//   `apps/server/node_modules` 解析 ⇒ 清理走 `$client` 原生 SQL，写入走 schema 表对象（二者都经
//   `apps/server/src/**` 间接解析，不受本文件位置影响）
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

/** 账号前缀（清理与建号共用 ⇒ 可重放） */
const PREFIX = 'm4b2_';
const ACCOUNTS = [
  { username: `${PREFIX}super`, role: 'superadmin' },
  { username: `${PREFIX}mgr`, role: 'admin' },
  { username: `${PREFIX}user`, role: 'user' },
] as const;

const db = createClient(connectionString);

// ① 清理本前缀既有账号的子集（含依赖行）——`"user"` 是 SQL 保留字，须加引号
const existing = await db.$client.query<{ id: string; username: string }>(
  'select id, username from "user" where username like $1',
  [`${PREFIX}%`],
);
if (existing.rowCount && existing.rowCount > 0) {
  const ids = existing.rows.map((row) => row.id);
  await db.$client.query('delete from session where user_id = any($1)', [ids]);
  await db.$client.query('delete from account where user_id = any($1)', [ids]);
  await db.$client.query('delete from "user" where id = any($1)', [ids]);
  console.log(
    `[seed] cleaned ${ids.length} existing account(s): ${existing.rows
      .map((row) => row.username)
      .join(', ')}`,
  );
}

// ② 建号（user + 凭据 account 同一事务，形态与官方写入路径一致）
for (const { username, role } of ACCOUNTS) {
  const userId = `usr_${crypto.randomUUID()}`;
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name: username,
      email: `${username}@local.test`,
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
      password: await hashPassword(password),
    });
  });
  console.log(`[seed] ${username} created (role=${role}, status=ACTIVE)`);
}

console.log(`[seed] done — ${ACCOUNTS.length} accounts ready`);
await db.$client.end();
