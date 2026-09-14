import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * 平台角色档位（docs/05 §6.1 四档线性；判定统一为 `role >= minRole`）。
 *
 * `GUEST` = 0 是**常量占位**（未登录不是库值，匿名请求按 0 档处理）；账号非 ACTIVE 与不存在同权（`null`）。
 * `ADMIN` = 10 · `SUPER_ADMIN` = 100。
 */
export const ROLE = { GUEST: 0, USER: 1, ADMIN: 10, SUPER_ADMIN: 100 } as const;

/**
 * 角色级守卫（design §5.2 / 主 design §4）。
 *
 * 行为：`role >= minRole` 通过 → 渲染子节点（缺省 `<Outlet />`，用作布局路由）；
 * **未登录（role = null）** → `/login?next=<当前 path+search>`；
 * **已登录但档位不足** → `/dashboard`（轻提示由消费批在重定向后触发，见 M4b-4）。
 *
 * ⚠ 本批（M4b-1）**只落组件、不接线路由**：`role` 由调用方传入（M4b-2 落认证与壳后由会话上下文注入）。
 * 这样组件本身可独立验证，且不与 M4b-2 的会话模型抢契约。
 */
export function RoleGuard({
  minRole,
  role,
  children,
}: {
  /** 通过门槛（档位数值，如 `ROLE.ADMIN`） */
  minRole: number;
  /** 当前用户档位：`null` = 未登录/账号非 ACTIVE；数字 = 已登录取值 */
  role: number | null;
  /** 缺省渲染 `<Outlet />`（布局路由用法） */
  children?: ReactNode;
}) {
  const location = useLocation();
  if (role === null || role === undefined) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (role < minRole) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children ?? <Outlet />}</>;
}
