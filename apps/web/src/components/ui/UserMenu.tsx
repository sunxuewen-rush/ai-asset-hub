import { LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '@/api/auth';
import { invalidateCache } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { ROLE } from '@/auth/roles';
import { Avatar, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/shadcn/sidebar';
import { type DictKey, useI18n } from '@/i18n/I18nProvider';

/**
 * 侧栏用户区（批 design §6.2 · 主 design §4「用户区落侧栏底部」）。
 *
 * 四态（`useAuth()` 三态 + 图标态，**首帧不闪**：`loading` 渲染骨架，`loading` 结束**就地替换**）：
 * - `loading` → 官方 `SidebarMenuSkeleton`（行骨架；**绝不**先渲染 anon 形态再切换）
 * - `anon` → `SidebarMenuButton asChild` + `Link to="/login"`（复用既有 `navigation.login` 键）
 * - `authed` → `DropdownMenu` + `SidebarMenuButton size="lg"`：`Avatar` 首字 + displayName + **角色徽章**
 *   + 菜单（我的资产 / 我的令牌 / ── / 登出）
 * - 图标态（`collapsible="icon"`）→ 只留头像（`group-data-[collapsible=icon]:hidden` 收文字；
 *   官方 `tooltip` 仅收起态显示）
 *
 * 登出链（design §4.4）：`logout()`（失败不阻断本地清态）→ `invalidateCache()` → `refresh()`
 * （重取 `/me` → `anon`）→ 回首页。菜单内路由均指向占位页（T3 已建，真页后续批替换）。
 */
const ROLE_BADGE_KEY: Partial<Record<number, DictKey<'navigation'>>> = {
  [ROLE.USER]: 'roleUser',
  [ROLE.ADMIN]: 'roleAdmin',
  [ROLE.SUPER_ADMIN]: 'roleSuperAdmin',
};

export function UserMenu() {
  const { state, role, refresh } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (state.status === 'loading') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuSkeleton showIcon />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (state.status === 'anon') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={t('navigation', 'login')}>
            <Link to="/login">
              <LogIn />
              <span>{t('navigation', 'login')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const badgeKey = role === null ? undefined : ROLE_BADGE_KEY[role];
  const initial = state.user.displayName.slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // 登出请求失败不阻断本地清态（design §4.4 以「清上下文 + 回首页」为准）
    }
    invalidateCache();
    await refresh();
    navigate('/', { replace: true });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={state.user.displayName}>
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:hidden">
                <span className="min-w-0 truncate font-medium">{state.user.displayName}</span>
                {badgeKey ? <Badge variant="secondary">{t('navigation', badgeKey)}</Badge> : null}
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/dashboard/assets">{t('dashboard', 'myAssets')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/tokens">{t('dashboard', 'tokens')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void handleLogout()}>
              {t('navigation', 'logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
