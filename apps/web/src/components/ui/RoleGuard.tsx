import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { hasRole } from '@/auth/roles';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { useI18n } from '@/i18n/I18nProvider';

/**
 * 角色级守卫（批 design §4.5 · 主 design P4/P6）。
 *
 * 三态（**内部 `useAuth()` 消费**——M4b-1 的 `role` prop 已删，不再经调用方中转）：
 * - `loading`：`/me` 未返回 → 官方 `Skeleton`（**绝不**先渲染「未登录」形态再切换，那就是「闪」）
 * - `anon`：`/login?next=<当前 path+search>`（登录后回原页）
 * - **档位不足**（`!hasRole(role, minRole)`）→ `/dashboard` + `state.notice`（Q17）——轻提示由
 *   `/dashboard` 挂载时消费（**不在此处 `toast`**：跳转前一闪既看不见也会在目标页丢失）
 *
 * 档位判定走**单点 `hasRole`**（design §4.5：禁页面散写 `role >= N`）；`ROLE.GUEST` 无特例分支。
 * 用法：布局路由 = 缺省渲染 `<Outlet />`；也可作为元素包裹（`children`）。
 */
export function RoleGuard({
  minRole,
  children,
}: {
  /** 通过门槛（档位数值，如 `ROLE.ADMIN`） */
  minRole: number;
  /** 缺省渲染 `<Outlet />`（布局路由用法） */
  children?: ReactNode;
}) {
  const { state, role } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (state.status === 'loading') {
    return <Skeleton className="h-40 w-full" />;
  }
  if (state.status === 'anon') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!hasRole(role, minRole)) {
    return <Navigate to="/dashboard" replace state={{ notice: t('common', 'noPermission') }} />;
  }
  return <>{children ?? <Outlet />}</>;
}
