import { eq } from 'drizzle-orm';
import { hashPassword } from '../auth/password.js';
import { createClient } from './client.js';
import { ACCOUNT_ROLE, localCredential, namespace, userAccount } from './schema/index.js';

/**
 * 种子（幂等 upsert；M4-pre 扁平化后）：
 * - `global` 空间（08 §4 → M4-pre design §2.5 G1-A：**保留**作资产坐标锚点）
 * - `SEED_ADMIN_*`（可选）：建本地账号并**直写** `role = SUPER_ADMIN`
 *
 * M4-pre 变更：平台角色不再是独立表 + 权限码矩阵（`role`/`permission`/`role_permission`/
 * `user_role_binding` 四表已删，design §2.1 R1/R4）——角色为 `user_account.role` 单列 4 档。
 * db 运维脚本只需 DATABASE_URL，不走全量 env。
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}
const db = createClient(connectionString);

/** global 空间锚点（幂等：按 slug upsert） */
async function seedGlobalNamespace(): Promise<void> {
  await db
    .insert(namespace)
    .values({
      slug: 'global',
      displayName: 'Global',
      type: 'GLOBAL',
      description: 'Platform-level public namespace',
      status: 'ACTIVE',
    })
    .onConflictDoNothing({ target: namespace.slug });
}

/** SEED_ADMIN_* env 存在 → 建本地账号并直写 `role = SUPER_ADMIN`（幂等：username 已存在则跳过） */
async function seedAdmin(): Promise<void> {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !password) return;

  const existing = await db
    .select({ id: localCredential.id })
    .from(localCredential)
    .where(eq(localCredential.username, username.toLowerCase().trim()));
  if (existing.length > 0) {
    console.log(`[seed] admin ${username} already exists, skip`);
    return;
  }

  const adminId = `usr_${crypto.randomUUID()}`;
  await db.transaction(async (tx) => {
    await tx.insert(userAccount).values({
      id: adminId,
      displayName: username,
      status: 'ACTIVE',
      role: ACCOUNT_ROLE.SUPER_ADMIN,
    });
    await tx.insert(localCredential).values({
      userId: adminId,
      username: username.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
    });
  });
  console.log(`[seed] admin ${username} created with role=SUPER_ADMIN`);
}

await seedGlobalNamespace();
await seedAdmin();
console.log('[seed] done');
await db.$client.end();
