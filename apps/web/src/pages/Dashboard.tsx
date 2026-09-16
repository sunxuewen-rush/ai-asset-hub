/**
 * 工作台临时落地页 `/dashboard`（批 design §5.3 · §5.4 内容槽形态；主 design Q5/Q17）。
 *
 * **本页为 M4b-4 三卡形态之前的过渡件**——目的是「登录后不白屏」：欢迎语 + 按档位裁剪的入口按钮组。
 *
 * **纯静态、零业务请求**：不调 `/api/reviews`、`/api/audit`、`/api/me/assets`（那些归 **M4b-4**，
 * 主 design P1-P5「不预埋空业务页」）⇒ 断言：页面发起的 `/api/*` 请求数 = **0**。
 *
 * **按 role 裁剪**（`hasRole` 单点，**禁散写 `role >= N`**；design §4.5）：
 * `role >= 1` → 我的资产 / 我的令牌；`role >= 10` → 审核队列（四档实测：未登录由 `RoleGuard` 拦，
 * 1 / 10 / 100 逐档命中）。
 *
 * **`location.state.notice` 消费（Q17）**：档位不足被 `RoleGuard` 弹回时携带 `state.notice`
 * ⇒ 挂载时 `toast.warning` 提示，**随即 `navigate(…, { replace: true, state: null })` 清 state**
 * （防刷新重复弹）。**不因此发任何网络请求**（仍属「零请求」）。
 */
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthProvider';
import { hasRole, ROLE } from '@/auth/roles';
import { ComingSoon } from '@/components/console/ComingSoon';
import { Button } from '@/components/ui/shadcn/button';
import { useI18n } from '@/i18n/I18nProvider';

export function Dashboard() {
  const { user, role } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  // Q17：消费守卫弹回时携带的 `state.notice`（toast 一次 + 立即清 state 防刷新重弹）
  useEffect(() => {
    const notice = (location.state as { notice?: string } | null)?.notice;
    if (!notice) return;
    toast.warning(notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  /** 入口按钮组（**按档位裁剪**：`hasRole` 单点，不散写阈值） */
  const entries = [
    {
      to: '/dashboard/assets',
      label: t('dashboard', 'myAssets'),
      visible: hasRole(role, ROLE.USER),
    },
    {
      to: '/dashboard/tokens',
      label: t('dashboard', 'tokens'),
      visible: hasRole(role, ROLE.USER),
    },
    {
      to: '/admin/reviews',
      label: t('admin', 'reviews'),
      visible: hasRole(role, ROLE.ADMIN),
    },
  ].filter((entry) => entry.visible);

  return (
    <ComingSoon title={t('dashboard', 'title')}>
      <p className="text-sm text-muted-foreground">
        {t('dashboard', 'welcome', { name: user?.displayName ?? '' })}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {entries.map((entry) => (
          <Button key={entry.to} asChild variant="outline">
            <Link to={entry.to}>{entry.label}</Link>
          </Button>
        ))}
      </div>
    </ComingSoon>
  );
}
