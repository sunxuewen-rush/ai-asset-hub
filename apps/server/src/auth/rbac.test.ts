import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, like } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

process.env.DATABASE_URL ??= 'postgres://aih:***@localhost:5433/ai_asset_hub_test';
process.env.SESSION_SECRET ??= 'x'.repeat(40);

import { createClient, type Db } from '../db/client.js';
import { type AccountRole, userAccount } from '../db/schema/index.js';
import { ACCOUNT_ROLE, isSelfReview, RbacService } from './rbac.js';

/**
 * 角色判定测试（M4-pre design §2.2：**唯一轴 4 档线性**，`role >= minRole`）。
 * - `roleOf` / `hasRole`：唯一判定入口（四档 + 非 ACTIVE/不存在 → null）
 *
 * M4-pre S2（板块 B）：空间域整体删除，原 `rbac.can()` / `getNamespaceRoles()` 过渡态随空间
 * 一并移除——`can()` 相关用例已按其唯一入口 `hasRole` 的等价语义收敛（管理档 = `role >= ADMIN`）。
 */

let db: Db;
let rbac: RbacService;

async function makeUser(displayName: string): Promise<string> {
  const id = `usr_${randomUUID()}`;
  await db.insert(userAccount).values({ id, displayName, status: 'ACTIVE' });
  return id;
}

async function setRole(userId: string, role: AccountRole): Promise<void> {
  await db.update(userAccount).set({ role }).where(eq(userAccount.id, userId));
}

beforeAll(async () => {
  db = createClient(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: './drizzle' });
  rbac = new RbacService(db);
});

afterAll(async () => {
  // 精确清理（displayName like 前缀——与其他测试文件并行互不踩）
  await db.delete(userAccount).where(like(userAccount.displayName, 'rbac-%'));
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

describe('hasRole —— 管理档判定（原 can() 平台侧语义收敛）', () => {
  it('管理档：role >= ADMIN（原 ASSET_ADMIN/USER_ADMIN/AUDITOR 三码表合并）', async () => {
    const uid = await makeUser('rbac-can-admin');
    await setRole(uid, ACCOUNT_ROLE.ADMIN);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.ADMIN)).resolves.toBe(true);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.USER)).resolves.toBe(true);
  });

  it('超管档：任意档为真', async () => {
    const uid = await makeUser('rbac-can-super');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.ADMIN)).resolves.toBe(true);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.SUPER_ADMIN)).resolves.toBe(true);
  });

  it('普通用户：不过管理档门', async () => {
    const uid = await makeUser('rbac-can-plain');
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.ADMIN)).resolves.toBe(false);
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.USER)).resolves.toBe(true);
  });

  it('DISABLED 用户 / 不存在用户 → 全假', async () => {
    const uid = await makeUser('rbac-can-disabled');
    await setRole(uid, ACCOUNT_ROLE.SUPER_ADMIN);
    await db.update(userAccount).set({ status: 'DISABLED' }).where(eq(userAccount.id, uid));
    await expect(rbac.hasRole(uid, ACCOUNT_ROLE.ADMIN)).resolves.toBe(false);
    await expect(rbac.hasRole('usr_no-such-user', ACCOUNT_ROLE.ADMIN)).resolves.toBe(false);
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
