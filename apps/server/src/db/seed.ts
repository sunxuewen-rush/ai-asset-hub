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
 * - 凭据行 `provider_id='credential'` · `account_id` = 登录名（与目录凭证插件查法一致）
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

  const existing = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.providerId, 'credential'), eq(account.accountId, username)));
  if (existing.length > 0) {
    console.log(`[seed] admin ${username} already exists, skip`);
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
        status: 'ACTIVE',
        role: 'superadmin',
        username,
        displayUsername: username,
      });
      await tx.insert(account).values({
        // 官方 account.id 由 adapter 生成随机串；直写路径自行生成（前缀区分来源）
        id: `acc_${crypto.randomUUID()}`,
        providerId: 'credential',
        accountId: username,
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
