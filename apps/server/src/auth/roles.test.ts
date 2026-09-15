import { describe, expect, test } from 'bun:test';
import { GUEST_LEVEL, isRoleName, levelOf, meetsRole, ROLE_LEVEL, ROLES } from './roles.js';

/** 权限码探针形态（与 `ROLE_STATEMENT` 同域；显式字面量类型防数组字面量被推宽成 string[]） */
interface PermissionProbe {
  asset?: ('publish' | 'manage')[];
  review?: ('submit' | 'approve')[];
  audit?: 'read'[];
  user?: ('list' | 'set-role' | 'ban' | 'create')[];
}

/**
 * 角色单点一致性（design §2.1 R4 断言⑤）。
 * 靶：**档位序（ROLE_LEVEL）与官方权限码声明（ROLES）必须同键同义**——两套表达一旦漂移，
 * 读面 `role >= N` 与凭证面权限码会各说各话。
 */

describe('roles：档位序 ↔ 权限码声明 一致性', () => {
  test('ROLE_LEVEL 键集合 === ROLES 键集合（防双源漂移）', () => {
    expect(Object.keys(ROLE_LEVEL).sort()).toEqual(Object.keys(ROLES).sort());
  });

  test('档位序单调且与 05 §6.1 四档取值一致（1 / 10 / 100）', () => {
    expect(ROLE_LEVEL.user).toBe(1);
    expect(ROLE_LEVEL.admin).toBe(10);
    expect(ROLE_LEVEL.superadmin).toBe(100);
    expect(ROLE_LEVEL.user).toBeLessThan(ROLE_LEVEL.admin);
    expect(ROLE_LEVEL.admin).toBeLessThan(ROLE_LEVEL.superadmin);
  });
});

describe('roles：档名 → 档位映射', () => {
  test('合法档名映射到对应序；未登录占位为 0', () => {
    expect(levelOf('user')).toBe(1);
    expect(levelOf('admin')).toBe(10);
    expect(levelOf('superadmin')).toBe(100);
    expect(levelOf(null)).toBe(GUEST_LEVEL);
    expect(levelOf(undefined)).toBe(GUEST_LEVEL);
    expect(levelOf('')).toBe(GUEST_LEVEL);
  });

  test('未知档名不越权：既不是合法档名，也只拿到未登录档位', () => {
    // 库中脏值/旧模型遗留（如数字档位、已删角色名）不得被当作有效档位
    expect(isRoleName('nope')).toBe(false);
    expect(isRoleName(10)).toBe(false);
    expect(levelOf('10')).toBe(GUEST_LEVEL);
    expect(meetsRole('nope', 'user')).toBe(false);
  });

  test('档位门：超管天然覆盖全部下级门槛（含自身）', () => {
    expect(meetsRole('user', 'user')).toBe(true);
    expect(meetsRole('user', 'admin')).toBe(false);
    expect(meetsRole('admin', 'admin')).toBe(true);
    expect(meetsRole('admin', 'superadmin')).toBe(false);
    expect(meetsRole('superadmin', 'superadmin')).toBe(true);
    expect(meetsRole('superadmin', 'user')).toBe(true);
  });
});

describe('roles：权限码声明（官方 access control）', () => {
  test('user 档：可发布与提交，不得管理资产/审核裁决/读审计/用户管理', () => {
    expect(ROLES.user.authorize({ asset: ['publish'] }).success).toBe(true);
    expect(ROLES.user.authorize({ review: ['submit'] }).success).toBe(true);
    const deniedProbes: PermissionProbe[] = [
      { asset: ['manage'] },
      { review: ['approve'] },
      { audit: ['read'] },
      { user: ['list'] },
      { user: ['set-role'] },
    ];
    for (const denied of deniedProbes) {
      expect(ROLES.user.authorize(denied).success).toBe(false);
    }
  });

  test('admin 档：追加资产管理/审核裁决/审计/用户列表，仍不得改角色或封禁', () => {
    expect(ROLES.admin.authorize({ asset: ['manage'] }).success).toBe(true);
    expect(ROLES.admin.authorize({ review: ['approve'] }).success).toBe(true);
    expect(ROLES.admin.authorize({ audit: ['read'] }).success).toBe(true);
    expect(ROLES.admin.authorize({ user: ['list'] }).success).toBe(true);
    expect(ROLES.admin.authorize({ user: ['set-role'] }).success).toBe(false);
    expect(ROLES.admin.authorize({ user: ['ban'] }).success).toBe(false);
  });

  test('superadmin 档：全量动作放行（与 05 §6.4 矩阵的超管全放一致）', () => {
    expect(
      ROLES.superadmin.authorize({
        asset: ['publish', 'manage'],
        review: ['submit', 'approve'],
        audit: ['read'],
        user: ['list', 'set-role', 'ban', 'create'],
      }).success,
    ).toBe(true);
  });

  test('档位越高授权面越宽（单调包含：user ⊆ admin ⊆ superadmin）', () => {
    const probes: PermissionProbe[] = [
      { asset: ['publish'] },
      { asset: ['manage'] },
      { review: ['submit'] },
      { review: ['approve'] },
      { audit: ['read'] },
      { user: ['list'] },
      { user: ['set-role'] },
      { user: ['ban'] },
      { user: ['create'] },
    ];
    const width = (role: (typeof ROLES)[keyof typeof ROLES]) =>
      probes.filter((probe) => role.authorize(probe).success).length;
    expect(width(ROLES.user)).toBeLessThanOrEqual(width(ROLES.admin));
    expect(width(ROLES.admin)).toBeLessThanOrEqual(width(ROLES.superadmin));
    expect(width(ROLES.superadmin)).toBe(probes.length);
  });
});
