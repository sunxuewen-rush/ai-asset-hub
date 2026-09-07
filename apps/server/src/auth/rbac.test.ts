import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import {
  namespace,
  namespaceMember,
  permission,
  type RoleCode,
  role,
  rolePermission,
  userAccount,
  userRoleBinding,
} from '../db/schema/index.js';
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_NAMES,
  PERMISSIONS,
} from './permissions.js';
import { isSelfReview, RbacService } from './rbac.js';

let db: Db;
let rbac: RbacService;
let nsId: number;

/** 幂等基线：角色 4 + 权限 10 + ASSET_ADMIN 绑定（复用 seed 同源常量） */
async function seedBaseline(): Promise<void> {
  for (const code of ALL_PERMISSIONS) {
    await db
      .insert(permission)
      .values({ code, name: PERMISSION_NAMES[code], groupCode: PERMISSION_GROUPS[code] })
      .onConflictDoNothing();
  }
  const roles = await db.select().from(role);
  if (roles.length === 0) {
    await db.insert(role).values([
      { code: 'SUPER_ADMIN', name: '超级管理员', isSystem: true },
      { code: 'ASSET_ADMIN', name: '资产管理员', isSystem: true },
      { code: 'USER_ADMIN', name: '用户管理员', isSystem: true },
      { code: 'AUDITOR', name: '审计员', isSystem: true },
    ]);
  }
  const assetAdmin = await db.select().from(role).where(eq(role.code, 'ASSET_ADMIN'));
  const perms = await db.select().from(permission);
  const permIdByCode = new Map(perms.map((p) => [p.code, p.id]));
  const assetPerms = [
    PERMISSIONS.assetPublish,
    PERMISSIONS.reviewSubmit,
    PERMISSIONS.assetManage,
    PERMISSIONS.assetPromote,
    PERMISSIONS.reviewApprove,
    PERMISSIONS.promotionApprove,
  ];
  for (const code of assetPerms) {
    await db
      .insert(rolePermission)
      .values({ roleId: assetAdmin[0]!.id, permissionId: permIdByCode.get(code)! })
      .onConflictDoNothing();
  }
}

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

async function bindPlatformRole(userId: string, roleCode: RoleCode): Promise<void> {
  const rows = await db.select().from(role).where(eq(role.code, roleCode));
  await db.insert(userRoleBinding).values({ userId, roleId: rows[0]!.id });
}

async function addNamespaceMember(
  userId: string,
  memberRole: 'OWNER' | 'ADMIN' | 'MEMBER',
): Promise<void> {
  await db.insert(namespaceMember).values({ namespaceId: nsId, userId, role: memberRole });
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  await seedBaseline();
  rbac = new RbacService(db);
  const inserted = await db
    .insert(namespace)
    .values({
      slug: `it-rbac-${randomUUID().slice(0, 8)}`,
      displayName: 'rbac test ns',
      type: 'TEAM',
    })
    .returning({ id: namespace.id });
  nsId = inserted[0]!.id;
});

afterAll(async () => {
  // 精确清理（displayName like 前缀；勿全表删 userRoleBinding/namespaceMember——与其他测试文件并行互踩）
  const mine = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'rbac-%'));
  for (const u of mine) {
    await db.delete(userRoleBinding).where(eq(userRoleBinding.userId, u.id));
    await db.delete(namespaceMember).where(eq(namespaceMember.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.delete(namespace).where(eq(namespace.id, nsId));
  await db.$client.end();
});

describe('RbacService.can — 判定链（05 §6.3）', () => {
  it('SUPER_ADMIN 短路任意权限', async () => {
    const uid = await makeUser('rbac-super');
    await bindPlatformRole(uid, 'SUPER_ADMIN');
    await expect(rbac.can(uid, PERMISSIONS.auditRead)).resolves.toBe(true);
    await expect(rbac.can(uid, PERMISSIONS.assetManage, { namespaceId: nsId })).resolves.toBe(true);
  });

  it('平台角色授予其绑定权限（ASSET_ADMIN）', async () => {
    const uid = await makeUser('rbac-asset-admin');
    await bindPlatformRole(uid, 'ASSET_ADMIN');
    await expect(rbac.can(uid, PERMISSIONS.assetPublish)).resolves.toBe(true);
    await expect(rbac.can(uid, PERMISSIONS.reviewApprove)).resolves.toBe(true);
    await expect(rbac.can(uid, PERMISSIONS.auditRead)).resolves.toBe(false);
    await expect(rbac.can(uid, PERMISSIONS.userManage)).resolves.toBe(false);
  });

  it('无平台角色且非空间成员 → 无权限', async () => {
    const uid = await makeUser('rbac-plain');
    await expect(rbac.can(uid, PERMISSIONS.assetPublish)).resolves.toBe(false);
    await expect(rbac.can(uid, PERMISSIONS.assetPublish, { namespaceId: nsId })).resolves.toBe(
      false,
    );
  });

  it('空间 MEMBER 可发布但不可提交审核/管理；无空间上下文时平台权限为准', async () => {
    const uid = await makeUser('rbac-member');
    await addNamespaceMember(uid, 'MEMBER');
    await expect(rbac.can(uid, PERMISSIONS.assetPublish, { namespaceId: nsId })).resolves.toBe(
      true,
    );
    // 05 §6.4：review:submit 需 owner 本人或 ADMIN/OWNER——普通 MEMBER 无（owner 判定走业务层）
    await expect(rbac.can(uid, PERMISSIONS.reviewSubmit, { namespaceId: nsId })).resolves.toBe(
      false,
    );
    await expect(rbac.can(uid, PERMISSIONS.assetPublish)).resolves.toBe(false);
    await expect(rbac.can(uid, PERMISSIONS.assetManage, { namespaceId: nsId })).resolves.toBe(
      false,
    );
  });

  it('空间 ADMIN 可审核/管成员（namespace:manage）', async () => {
    const uid = await makeUser('rbac-ns-admin');
    await addNamespaceMember(uid, 'ADMIN');
    await expect(rbac.can(uid, PERMISSIONS.namespaceManage, { namespaceId: nsId })).resolves.toBe(
      true,
    );
    await expect(rbac.can(uid, PERMISSIONS.reviewApprove, { namespaceId: nsId })).resolves.toBe(
      true,
    );
  });

  it('FROZEN 空间拒写（MEMBER）；SUPER_ADMIN 短路不受限', async () => {
    const member = await makeUser('rbac-frozen-member');
    await addNamespaceMember(member, 'MEMBER');
    await db.update(namespace).set({ status: 'FROZEN' }).where(eq(namespace.id, nsId));
    await expect(rbac.can(member, PERMISSIONS.assetPublish, { namespaceId: nsId })).resolves.toBe(
      false,
    );
    const superId = await makeUser('rbac-frozen-super');
    await bindPlatformRole(superId, 'SUPER_ADMIN');
    await expect(rbac.can(superId, PERMISSIONS.assetPublish, { namespaceId: nsId })).resolves.toBe(
      true,
    );
    await db.update(namespace).set({ status: 'ACTIVE' }).where(eq(namespace.id, nsId));
  });

  it('DISABLED 用户拒绝全部（即使 SUPER_ADMIN）', async () => {
    const uid = await makeUser('rbac-disabled');
    await bindPlatformRole(uid, 'SUPER_ADMIN');
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, uid));
    await expect(rbac.can(uid, PERMISSIONS.auditRead)).resolves.toBe(false);
  });

  it('不存在的用户拒绝', async () => {
    await expect(rbac.can('usr_no-such-user', PERMISSIONS.auditRead)).resolves.toBe(false);
  });
});

describe('isSelfReview 防自审助手（05 §6.4）', () => {
  it('相等 → true（自审须拒）', () => {
    expect(isSelfReview('usr_a', 'usr_a')).toBe(true);
  });

  it('不同人 → false（可审）', () => {
    expect(isSelfReview('usr_a', 'usr_b')).toBe(false);
  });

  it('SUPER_ADMIN 例外 → false（放行）', () => {
    expect(isSelfReview('usr_a', 'usr_a', true)).toBe(false);
  });
});
