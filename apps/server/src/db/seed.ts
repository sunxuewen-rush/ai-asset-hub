import { eq } from 'drizzle-orm';
import { getDb } from './client.js';
import { localCredential, namespace, permission, role, rolePermission, userAccount, userRoleBinding } from './schema/index.js';
import { hashPassword } from '../auth/password.js';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_NAMES, PERMISSIONS } from '../auth/permissions.js';

/**
 * 种子（幂等 upsert）：四平台角色（05 §6.1）+ 权限码十枚（05 §6.4）+ global 空间（08 §4）
 * + SEED_ADMIN（可选，R6）。role/permission 按 code、namespace 按 slug upsert。
 */

const db = getDb();

const ROLES = [
  { code: 'SUPER_ADMIN', name: '超级管理员', description: '拥有所有权限（硬判定短路 05 §6.3）' },
  { code: 'ASSET_ADMIN', name: '资产管理员', description: '全局空间审核、提升审核、隐藏/恢复资产、撤回已发布版本' },
  { code: 'USER_ADMIN', name: '用户管理员', description: '准入审批、封禁/解封、角色分配（不可分配 SUPER_ADMIN）' },
  { code: 'AUDITOR', name: '审计员', description: '审计日志只读' },
] as const;

/** 角色 → 权限绑定矩阵（05 §6.4；SUPER_ADMIN 不绑行——硬判定短路） */
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ASSET_ADMIN: [
    PERMISSIONS.assetPublish,
    PERMISSIONS.reviewSubmit,
    PERMISSIONS.assetManage,
    PERMISSIONS.assetPromote,
    PERMISSIONS.reviewApprove,
    PERMISSIONS.promotionApprove,
  ],
  USER_ADMIN: [PERMISSIONS.userManage, PERMISSIONS.userApprove],
  AUDITOR: [PERMISSIONS.auditRead],
};

async function seedRolesAndPermissions(): Promise<void> {
  // 角色
  for (const r of ROLES) {
    await db
      .insert(role)
      .values({ code: r.code, name: r.name, description: r.description, isSystem: true })
      .onConflictDoNothing({ target: role.code });
  }
  // 权限
  for (const code of ALL_PERMISSIONS) {
    await db
      .insert(permission)
      .values({ code, name: PERMISSION_NAMES[code], groupCode: PERMISSION_GROUPS[code] })
      .onConflictDoNothing({ target: permission.code });
  }
  // 角色-权限绑定
  const roles = await db.select().from(role);
  const permissions = await db.select().from(permission);
  const roleIdByCode = new Map<string, number>(roles.map((r) => [r.code, r.id]));
  const permissionIdByCode = new Map<string, number>(permissions.map((p) => [p.code, p.id]));

  for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIdByCode.get(roleCode);
    if (roleId === undefined) throw new Error(`seed: role ${roleCode} not found`);
    for (const permCode of permCodes) {
      const permissionId = permissionIdByCode.get(permCode);
      if (permissionId === undefined) throw new Error(`seed: permission ${permCode} not found`);
      await db
        .insert(rolePermission)
        .values({ roleId, permissionId })
        .onConflictDoNothing();
    }
  }
}

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

/** SEED_ADMIN_* env 存在 → 建本地账号并绑 SUPER_ADMIN（R6；幂等：username 已存在则跳过） */
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
    await tx
      .insert(userAccount)
      .values({ id: adminId, displayName: username, status: 'ACTIVE' });
    await tx.insert(localCredential).values({
      userId: adminId,
      username: username.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
    });
    const superAdmin = await tx.select().from(role).where(eq(role.code, 'SUPER_ADMIN'));
    if (superAdmin.length === 0) throw new Error('seed: SUPER_ADMIN role not found');
    await tx.insert(userRoleBinding).values({ userId: adminId, roleId: superAdmin[0]!.id });
  });
  console.log(`[seed] admin ${username} created with SUPER_ADMIN`);
}

await seedRolesAndPermissions();
await seedGlobalNamespace();
await seedAdmin();
console.log('[seed] done');
await db.$client.end();
