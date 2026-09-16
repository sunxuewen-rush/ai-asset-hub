/**
 * 角色档位判定单点（批 design §4.5 · 主 design §4 显隐矩阵）。
 *
 * 值与服务端 `apps/server/src/auth/roles.ts` 的 `ACCOUNT_ROLE` **逐档同值**：
 * `GUEST 0 / USER 1 / ADMIN 10 / SUPER_ADMIN 100`（服务端 `ROLE_LEVEL` = 档名→数值映射，
 * `GUEST_LEVEL` = 未登录派生档）。
 *
 * 前端 `GUEST` 仅作**常量占位**（未登录不是库值）——**无特例分支**：判定一律走 `hasRole`。
 *
 * 纪律：**禁页面散写 `role >= N`**——侧栏组/条目、用户区徽章、`/dashboard` 入口、
 * `RoleGuard` 全部经本文件（design §4.5「角色判定单点」）。
 */

/** 四档线性单值（05 §6.1） */
export const ROLE = {
  GUEST: 0,
  USER: 1,
  ADMIN: 10,
  SUPER_ADMIN: 100,
} as const;

export type RoleLevel = (typeof ROLE)[keyof typeof ROLE];

/**
 * 档位门：`role >= min`。
 *
 * `null` / `undefined`（未登录 · 账号非 ACTIVE · `/me` 未返回）= **false**——
 * 与服务端「无角色与未登录同权」同向从严（design §4.5）。
 */
export function hasRole(role: number | null | undefined, min: number): boolean {
  if (role === null || role === undefined) return false;
  return role >= min;
}
