/**
 * 观看者（会话 + 档位）读取 —— M4b-4 T12 前置件（批 plan F47 / 批 design §3.1 件表补件）。
 *
 * 存在理由：web 侧此前只有 `useAuth()` 原语（`{state, role, user, refresh}`），
 * 而「按权限显隐」需要的是**当前观看者**的稳定视图（登录态 + 档位 + 派生档门）。
 * 照 `auth/roles.ts`「角色判定单点」纪律收敛 ⇒ 页面**不散写** `role >= N`
 * （`role >= N` 一律经 `@/auth/roles` 的 `hasRole`，派生档门经本 hook）。
 *
 * 与 `useAuth()` 的关系：**只读包装，零新增请求**——会话值来自 `<AuthProvider>`
 * 挂载时的 `/me`（`main.tsx` 已预热）。
 *
 * 档门语义（与服务端同源，逐条见 `lib/asset-permissions.ts`）：
 * - `canManageAll` = `role >= ADMIN`（10）—— 管理档（平台治理面）
 * - `isSuperAdmin` = `role >= SUPER_ADMIN`（100）—— 超管专属面（特权标签）
 * `loading` / `anon` ⇒ 两项均 `false`（与 `hasRole(null)` 同向从严：「无角色与未登录同权」）。
 */
import { type AuthStatus, useAuth } from '../auth/AuthProvider.js';
import { hasRole, ROLE } from '../auth/roles.js';

export interface Viewer {
  /** 会话三态（`loading` 期间**不得**按 anon 渲染——防首帧闪烁，沿 U1 口径） */
  status: AuthStatus;
  loading: boolean;
  /** 登录用户 id（`loading` / `anon` ⇒ `null`） */
  userId: string | null;
  /** 登录用户显示名（`loading` / `anon` ⇒ `null`）—— 工作台欢迎语消费 */
  displayName: string | null;
  /** 数值档位（`loading` / `anon` ⇒ `null`） */
  role: number | null;
  /** 管理档（`role >= ADMIN`） */
  canManageAll: boolean;
  /** 超管（`role >= SUPER_ADMIN`） */
  isSuperAdmin: boolean;
}

export function useViewer(): Viewer {
  const { state, role, user } = useAuth();
  return {
    status: state.status,
    loading: state.status === 'loading',
    userId: user?.id ?? null,
    displayName: user?.displayName ?? null,
    role,
    canManageAll: hasRole(role, ROLE.ADMIN),
    isSuperAdmin: hasRole(role, ROLE.SUPER_ADMIN),
  };
}
