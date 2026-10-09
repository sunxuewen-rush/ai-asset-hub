import { and, eq } from 'drizzle-orm';
import { hashPassword } from '../auth/better-auth.js';
import { createClient } from './client.js';
import { account, user } from './schema/index.js';

/**
 * 种子（幂等；M4-pre 扁平化 → M4b-pre T3 迁到官方用户域表）：
 * - `SEED_ADMIN_*`（可选）：建本地账号并**直写** `user.role = 'superadmin'`（4 档最高档）
 * - `SEED_ADMIN_EMAIL`（可选，默认 `admin@local.test`）：bootstrap 合成邮箱——本设计**唯一合成点**（R13）
 *
 * 写入形态 = 官方模型表（`user` + `account`），列/哈希格式与官方写入路径一致：
 * - 口令哈希用注入官方的同一 scrypt 实现（`hashPassword`，R10）⇒ 官方登录端点可直接验
 * - 凭据行 `provider_id='credential'` · **`account_id = user.id`**（官方 `findCredentialAccount` 三条件之一 ——
 *   M4c-1 T6 对齐；写登录名会让官方 `/sign-in/username` 永久 401）
 *
 * 为什么不用官方 `create-admin` CLI：实测**非幂等**（同 email 二次执行报 `User already exists`，
 * 连 `--force` 也不覆盖，X8）⇒ 会破坏「种子可重复执行」契约。
 * 为什么不用官方 API（`internalAdapter.createUser`）：官方实例装配需**全量 env**（`SESSION_SECRET` 等），
 * 而既有约定是「db 运维脚本只需 `DATABASE_URL`」——此处直写官方表形态，保持该约定。
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
const db = createClient(connectionString);

async function seedAdmin(): Promise<void> {
  const username = process.env.SEED_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@local.test').trim().toLowerCase();
  if (!username || !password) return;

  // 存在性判据 = `user.username`（官方唯一约束位），与凭据行 `account_id` 解耦
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.username, username));
  if (existing.length > 0) {
    const rowId = existing[0]?.id;
    if (!rowId) return;

    // 幂等收敛：刷新口令 + 把凭据行 `account_id` 归一为 `user.id`（官方 `findCredentialAccount` 三条件）
    await db
      .update(account)
      .set({ password: await hashPassword(password), accountId: rowId })
      .where(and(eq(account.providerId, 'credential'), eq(account.userId, rowId)));
    console.log(`[seed] admin ${username} exists — password refreshed + account_id normalized`);
    return;
  }

  const adminId = `usr_${crypto.randomUUID()}`;
  try {
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: adminId,
        name: username,
        email,
        emailVerified: true,
        role: 'superadmin',
        username,
        displayUsername: username,
      });
      await tx.insert(account).values({
        // 官方 account.id 由 adapter 生成随机串；直写路径自行生成（前缀区分来源）
        id: `acc_${crypto.randomUUID()}`,
        providerId: 'credential',
        accountId: adminId, // 官方 findCredentialAccount 三条件：account_id = user.id（M4c-1 T6 对齐）
        userId: adminId,
        password: await hashPassword(password),
      });
    });
  } catch (err) {
    if ((err as { cause?: { code?: string } }).cause?.code === '23505') {
      console.log(`[seed] admin ${username} already exists, skip`);
      return;
    }
    throw err;
  }
  console.log(`[seed] admin ${username} created with role=superadmin`);
}

await seedAdmin();
console.log('[seed] done');
await db.$client.end();
