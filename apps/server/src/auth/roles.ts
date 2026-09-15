import { createAccessControl } from 'better-auth/plugins/access';

/**
 * 角色与权限码单点（design `2026-09-15-m4b-pre-auth-migration-design.md` §2.1 R4 / §1.4）。
 *
 * 模型分工（两套表达，一个真值）：
 * - **档位序**：`ROLE_LEVEL`（数值线性，05 §6.1 四档：未登录 0 / 用户 1 / 管理 10 / 超管 100）——
 *   读面精细判定（`role >= N`）与排序用，`RbacService.roleOf()` 仍返回档位数值，调用面零改动。
 * - **权限码**：官方 admin 插件的 access control（`resource: action[]`）——凭证面判定（api-key 权限码、
 *   官方端点内部校验）用；取值与 M3/M4-pre 既有 token scope 码 1:1。
 *
 * 一致性由 `roles.test.ts` 锁定：**`ROLE_LEVEL` 键集合 === `ROLES` 键集合**（防两套表达漂移）。
 * 库中 `user.role` 存**档名文本**（`user` / `admin` / `superadmin`），不存数字。
 */

/** 档位序（可分配三档；未登录由服务端派生 = 0，不入库） */
export const ROLE_LEVEL = {
  user: 1,
  admin: 10,
  superadmin: 100,
} as const;

export type RoleName = keyof typeof ROLE_LEVEL;

/** 未登录档（05 §6.1 的 0 档；`roleOf()` 返回 null 时的等价档位） */
export const GUEST_LEVEL = 0;

/**
 * 权限码 statement（官方 access control 形态：资源 → 动作数组）。
 * 动作集覆盖既有 token scope 码 + 官方 admin 插件在本项目需要的最小动作面。
 * M4c（账号与权限治理）若接线官方 `set-password` / `delete` / `impersonate` 端点，在此处扩展。
 */
export const ROLE_STATEMENT = {
  asset: ['publish', 'manage'],
  review: ['submit', 'approve'],
  audit: ['read'],
  user: ['list', 'set-role', 'ban', 'create'],
} as const;

export const ac = createAccessControl(ROLE_STATEMENT);

/**
 * 档位 → 权限码集合（与 05 §6.4 操作 × 角色矩阵对齐）：
 * - `user`：发布资产 + 提交审核（自助面）
 * - `admin`：追加资产管理 / 审核裁决 / 审计浏览 / 用户列表
 * - `superadmin`：全量（含改角色、封禁）
 */
export const ROLES = {
  user: ac.newRole({
    asset: ['publish'],
    review: ['submit'],
  }),
  admin: ac.newRole({
    asset: ['publish', 'manage'],
    review: ['submit', 'approve'],
    audit: ['read'],
    user: ['list'],
  }),
  superadmin: ac.newRole({
    asset: ['publish', 'manage'],
    review: ['submit', 'approve'],
    audit: ['read'],
    user: ['list', 'set-role', 'ban', 'create'],
  }),
} as const;

/** 档名校验（库中文本值 → 合法档位） */
export function isRoleName(value: unknown): value is RoleName {
  return typeof value === 'string' && Object.hasOwn(ROLE_LEVEL, value);
}

/** 档名 → 数值档位（未知/空 → `GUEST_LEVEL`；`roleOf()` 的映射实现） */
export function levelOf(role: unknown): number {
  return isRoleName(role) ? ROLE_LEVEL[role] : GUEST_LEVEL;
}

/** 档位门：`role >= minRole`（含超管天然覆盖；库中标量档名 ⇄ 数值序） */
export function meetsRole(role: unknown, minRole: RoleName): boolean {
  return levelOf(role) >= ROLE_LEVEL[minRole];
}
