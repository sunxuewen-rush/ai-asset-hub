import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { type AccountRole, namespace, namespaceMember, userAccount } from '../db/schema/index.js';
import { ACCOUNT_ROLE, isSelfReview, RbacService } from './rbac.js';

/**
 * 角色判定测试（M4-pre design §2.2：**唯一轴 4 档线性**，`role >= minRole`）。
 * - `roleOf` / `hasRole`：新判定入口（四档 + 非 ACTIVE/不存在 → null）
 * - `can()`：**过渡态**（S1→S2 之间为空间相关调用点保留；平台侧 = 管理档全权，空间侧原语义）
 */

let db: Db;
let rbac: RbacService;
let nsId: number;

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

async function setRole(userId: string, role: AccountRole): Promise<void> {
  await db.update(userAccount).set({ role }).where(eq(userAccount.id, userId));
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
  // 精确清理（displayName like 前缀；勿全表删 namespaceMember——与其他测试文件并行互踩）
  const mine = await db
    .select({ id: userAccount.id })
    .from(userAccount)
    .where(like(userAccount.displayName, 'rbac-%'));
  for (const u of mine) {
    await db.delete(namespaceMember).where(eq(namespaceMember.userId, u.id));
    await db.delete(userAccount).where(eq(userAccount.id, u.id));
  }
  await db.delete(namespace).where(eq(namespace.id, nsId));
  await db.$client.end();
});

describe('RbacService.roleOf / hasRole —— 4 档层级（M4-pre §2.2）', () => {
  it('SUPER_ADMIN 档：roleOf=100，hasRole 对任意档为真', async () => {
    const uid = await makeUser('rbac-super');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    await expect(rbac.roleOf(uid)).resolves.toBe(ACCOUNT_ROLE.SUPER_ADMIN);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.USER)).resolves.toBe(true);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.ADMIN)).resolves.toBe(true);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.SUPER_ADMIN)).resolves.toBe(true);
  });

  it('ADMIN 档：过 USER/ADMIN 门，不过 SUPER_ADMIN 门', async () => {
    const uid = await makeUser('rbac-admin');
    await setRole(uid, ACCOUNT_ROLE.ADMIN);
    await expect(rbac.roleOf(uid)).resolves.toBe(ACCOUNT_ROLE.ADMIN);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.USER)).resolves.toBe(true);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.ADMIN)).resolves.toBe(true);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.SUPER_ADMIN)).resolves.toBe(false);
  });

  it('USER 档（默认）：仅过 USER 门', async () => {
    const uid = await makeUser('rbac-user');
    await expect(rbac.roleOf(uid)).resolves.toBe(ACCOUNT_ROLE.USER);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.USER)).resolves.toBe(true);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.ADMIN)).resolves.toBe(false);
  });

  it('DISABLED 用户 → roleOf=null，hasRole 全假（即使 role=超管）', async () => {
    const uid = await makeUser('rbac-disabled');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, uid));
    await expect(rbac.roleOf(uid)).resolves.toBeNull();
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.USER)).resolves.toBe(false);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.ADMIN)).resolves.toBe(false);
  });

  it('不存在的用户 → roleOf=null', async () => {
    await expect(rbac.roleOf('usr_no-such-user')).resolves.toBeNull();
    await expect(rbac.hasRole('usr_no-such-user', ACCOUNT_ROLE.USER)).resolves.toBe(false);
  });
});

describe('RbacService.can —— 过渡态兼容（M4-pre S1→S2）', () => {
  it('管理档：平台侧全权（原 ASSET_ADMIN/USER_ADMIN/AUDITOR 三码表合并）', async () => {
    const uid = await makeUser('rbac-can-admin');
    await setRole(uid, ACCOUNT_ROLE.ADMIN);
    await expect(rbac.can(uid, 'asset:publish')).resolves.toBe(true);
    await expect(rbac.can(uid, 'review:approve')).resolves.toBe(true);
    await expect(rbac.can(uid, 'audit:read')).resolves.toBe(true);
    await expect(rbac.can(uid, 'asset:manage', { namespaceId: nsId })).resolves.toBe(true);
  });

  it('超管档：任意码 + 任意空间上下文为真', async () => {
    const uid = await makeUser('rbac-can-super');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    await expect(rbac.can(uid, 'audit:read')).resolves.toBe(true);
    await expect(rbac.can(uid, 'asset:manage', { namespaceId: nsId })).resolves.toBe(true);
  });

  it('普通用户且非空间成员 → 全假', async () => {
    const uid = await makeUser('rbac-can-plain');
    await expect(rbac.can(uid, 'asset:publish')).resolves.toBe(false);
    await expect(rbac.can(uid, 'asset:publish', { namespaceId: nsId })).resolves.toBe(false);
  });

  it('空间 MEMBER 可发布、不可提交审核/管理；无空间上下文时平台侧为准', async () => {
    const uid = await makeUser('rbac-can-member');
    await addNamespaceMember(uid, 'MEMBER');
    await expect(rbac.can(uid, 'asset:publish', { namespaceId: nsId })).resolves.toBe(true);
    await expect(rbac.can(uid, 'review:submit', { namespaceId: nsId })).resolves.toBe(false);
    await expect(rbac.can(uid, 'asset:manage', { namespaceId: nsId })).resolves.toBe(false);
    await expect(rbac.can(uid, 'asset:publish')).resolves.toBe(false);
  });

  it('空间 ADMIN 可管成员/审核本空间', async () => {
    const uid = await makeUser('rbac-can-ns-admin');
    await addNamespaceMember(uid, 'ADMIN');
    await expect(rbac.can(uid, 'namespace:manage', { namespaceId: nsId })).resolves.toBe(true);
    await expect(rbac.can(uid, 'review:approve', { namespaceId: nsId })).resolves.toBe(true);
  });

  it('FROZEN 空间拒写（普通档）；管理档不受限', async () => {
    const member = await makeUser('rbac-can-frozen-member');
    await addNamespaceMember(member, 'MEMBER');
    await db.update(namespace).set({ status: 'FROZEN' }).where(eq(namespace.id, nsId));
    await expect(rbac.can(member, 'asset:publish', { namespaceId: nsId })).resolves.toBe(false);
    const adminId = await makeUser('rbac-can-frozen-admin');
    await setRole(adminId, ACCOUNT_ROLE.ADMIN);
    await expect(rbac.can(adminId, 'asset:publish', { namespaceId: nsId })).resolves.toBe(true);
    await db.update(namespace).set({ status: 'ACTIVE' }).where(eq(namespace.id, nsId));
  });

  it('DISABLED 用户 / 不存在用户 → 全假', async () => {
    const uid = await makeUser('rbac-can-disabled');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, uid));
    await expect(rbac.can(uid, 'audit:read')).resolves.toBe(false);
    await expect(rbac.can('usr_no-such-user', 'audit:read')).resolves.toBe(false);
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
