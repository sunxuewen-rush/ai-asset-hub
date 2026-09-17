import { cn } from 'cn';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/shadcn/sidebar';
import { fetchStats } from '../../api/stats.js';
import type { AssetType } from '../../api/types.js';
import { useAuth } from '../../auth/AuthProvider.js';
import { hasRole, ROLE } from '../../auth/roles.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import { TypeIcon } from './TypeIcon.js';
import { UserMenu } from './UserMenu.js';

type NavType = 'home' | AssetType;

interface NavEntry {
  type: NavType;
  to: string;
  zhLabel: string;
  enLabel: string;
}

/** 类型 icon 衬底（design §4.4 ②：`--tint-*` 衬底 + `--type-*` 前景；渐变已废弃） */
const ICON_BY_TYPE: Record<AssetType, { idle: string; active: string }> = {
  skill: { idle: 'bg-tint-skill text-type-skill', active: 'bg-type-skill text-white' },
  mcp: { idle: 'bg-tint-mcp text-type-mcp', active: 'bg-type-mcp text-white' },
  agent: { idle: 'bg-tint-agent text-type-agent', active: 'bg-type-agent text-white' },
};

/**
 * 精确匹配路径（其余条目按前缀匹配）——首页与控制台首页。
 *
 * `/dashboard` 必须精确：它是个人组的**分区父项**，而 `/dashboard/assets|submissions|tokens`
 * 是它的子路径 ⇒ 前缀匹配会让「工作台」在任一子页与子页**同时高亮**
 * （M4b-3 T9④ 实测，2026-09-17 用户拍板 ①）。
 */
const EXACT_MATCH_PATHS = new Set(['/', '/dashboard']);

/**
 * 侧栏导航（批 design §6.1 显隐矩阵 · 主 design §4「入口分层与显隐规则」为唯一源）。
 *
 * **门户组**（首页 + 三中心 + 计数）= M4a 既有形态：**无组标题平铺**、`SidebarMenu` 直挂、
 * 定制外观（类型色图块 + 双行 zh/en + 计数）——**Q3 零回归：本组 JSX 与逻辑零改动**。
 *
 * **三组**（个人 / 管理 / 超级管理）= 官方标准形态 `SidebarGroup` > `SidebarGroupLabel` +
 * `SidebarGroupContent` > `SidebarMenu`：
 * - 组级与条目级**同取门槛**：个人组 = `state === 'authed'`（**不依赖 `role`**——服务端 `role` 缺省为
 *   `GUEST(0)`，用 `hasRole(role, 1)` 会把未分配角色的登录用户挡在门外，与 design §6.1 不符）；
 *   管理组 = `hasRole(role, ROLE.ADMIN)`；超级管理组 = `hasRole(role, ROLE.SUPER_ADMIN)`
 * - **组内无可见条目 ⇒ 整组不渲染**（主 design §4）
 * - 占位条目（系统设置 / 用户管理）= `<button>`（**非 `Link`**）+ `sonner` 轻提示；**不建路由、不建页面**
 *   （design §6.3；提示文案复用 `common.comingSoon`）
 * - 图标态（`collapsible="icon"`）组标题随**官方默认**（`SidebarGroupLabel` 自带
 *   `group-data-[collapsible=icon]:-mt-8 …:opacity-0`）——**不自写隐藏类**
 *
 * **F3 登记（混排结构视觉）**：门户组（裸 `SidebarMenu`）× 三组（`SidebarGroup`）在同一
 * `SidebarContent` 内的间距/分段为**实测记录项**（T4 记录计算值 + 观感交用户确认），
 * **不为统一而改门户组结构**。
 *
 * 收起/展开（plan T7b，design v0.12）：接入 shadcn `Sidebar` 原语——`collapsible="icon"`（收起为 48px
 * 图标轨、悬停出 tooltip）+ `variant="floating"`（浮起面板）+ `SidebarRail`（右缘可拖/点）；
 * 开合由顶栏 `SidebarTrigger` / `⌘B`·`Ctrl+B` 驱动，状态 cookie 持久化，<768px 自动 Sheet。
 * **AIH 覆盖 3 处**（design §4.4 ③）：定位 `top-[58px] bottom-0 h-auto`（留在 58px 顶栏之下）·
 * 面板圆角 `2xl`(18px)（官方 floating 为 `lg` 10px）· 展开/图标态宽度由 `SidebarProvider` 变量覆盖。
 * 不变：导航条目 / 路由 / 计数逻辑；激活判定改 `useLocation`（原 NavLink 子函数渲染，与 `asChild` 不兼容）。
 */
export function SideNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);
  const { state, role } = useAuth();

  const entries: NavEntry[] = [
    { type: 'home', to: '/', zhLabel: t('navigation', 'home'), enLabel: 'Home' },
    { type: 'skill', to: '/skills', zhLabel: t('navigation', 'skills'), enLabel: 'Skills' },
    { type: 'mcp', to: '/mcps', zhLabel: t('navigation', 'mcps'), enLabel: 'MCP Servers' },
    { type: 'agent', to: '/agents', zhLabel: t('navigation', 'agents'), enLabel: 'Agents' },
  ];

  const countOf = (type: NavType): number | undefined =>
    type === 'home' ? undefined : stats?.typeCounts[type];

  /** 激活判定（精确匹配集合 = `EXACT_MATCH_PATHS`；其余按路径前缀匹配——等价原 `NavLink end`） */
  const isActive = (to: string): boolean =>
    EXACT_MATCH_PATHS.has(to) ? pathname === to : pathname.startsWith(to);

  /**
   * 三组条目（文案在组件内求值 ⇒ 语言切换随上下文重渲染；`to` 缺省 = 占位条目）。
   * 门槛：`'authed'` = 已登录即可（个人组）· 数字 = `hasRole` 档位。
   */
  const navGroups: Array<{
    labelKey: 'groupPersonal' | 'groupAdmin' | 'groupSuperAdmin';
    gate: 'authed' | number;
    entries: Array<{ to?: string; text: string }>;
  }> = [
    {
      labelKey: 'groupPersonal',
      gate: 'authed',
      entries: [
        { to: '/dashboard', text: t('dashboard', 'title') },
        { to: '/dashboard/assets', text: t('dashboard', 'myAssets') },
        { to: '/dashboard/submissions', text: t('dashboard', 'submissions') },
        { to: '/dashboard/tokens', text: t('dashboard', 'tokens') },
      ],
    },
    {
      labelKey: 'groupAdmin',
      gate: ROLE.ADMIN,
      entries: [
        { to: '/admin/reviews', text: t('admin', 'reviews') },
        { to: '/admin/audit', text: t('admin', 'audit') },
      ],
    },
    {
      labelKey: 'groupSuperAdmin',
      gate: ROLE.SUPER_ADMIN,
      entries: [
        { to: '/admin/labels', text: t('admin', 'labels') },
        { text: t('admin', 'settings') },
        { text: t('admin', 'users') },
      ],
    },
  ];

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="top-[58px] bottom-0 h-auto [&>[data-slot=sidebar-inner]]:rounded-2xl"
    >
      <SidebarContent className="gap-1 px-1 pt-1">
        {/* ── 门户组（M4a 既有形态：无组标题平铺 · Q3 零回归，本块源码零改动）── */}
        <SidebarMenu className="gap-[3px]">
          {entries.map(({ type, to, zhLabel, enLabel }) => {
            const count = countOf(type);
            const active = isActive(to);
            return (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={zhLabel}
                  className="h-auto gap-[11px] px-2 py-2.5 font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground data-[active=true]:font-semibold data-[active=true]:text-foreground"
                >
                  <NavLink to={to}>
                    <span
                      className={cn(
                        'flex size-[22px] shrink-0 items-center justify-center rounded-sm text-xs',
                        type === 'home' ? 'bg-muted' : ICON_BY_TYPE[type].idle,
                        active &&
                          (type === 'home'
                            ? 'bg-primary text-primary-foreground'
                            : ICON_BY_TYPE[type].active),
                      )}
                    >
                      {type === 'home' ? '⌂' : <TypeIcon type={type} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col leading-[1.25] group-data-[collapsible=icon]:hidden">
                      {zhLabel}
                      <em className="font-normal text-[11px] text-muted-foreground/70 not-italic tracking-[0.2px]">
                        {enLabel}
                      </em>
                    </span>
                    {count !== undefined && (
                      <span className="ml-auto font-medium text-[11px] text-muted-foreground/70 tabular-nums group-data-[collapsible=icon]:hidden">
                        {count.toLocaleString()}
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* ── 三组（官方标准形态；组级 + 条目级同取门槛；组内无可见条目 ⇒ 整组不渲染）── */}
        {navGroups.map((group) => {
          const allowed =
            group.gate === 'authed' ? state.status === 'authed' : hasRole(role, group.gate);
          if (!allowed || group.entries.length === 0) return null;
          return (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel>{t('navigation', group.labelKey)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.entries.map((entry) => (
                    <SidebarMenuItem key={entry.to ?? entry.text}>
                      <SidebarMenuButton
                        asChild={entry.to !== undefined}
                        isActive={entry.to !== undefined && isActive(entry.to)}
                        tooltip={entry.text}
                        onClick={
                          entry.to === undefined
                            ? () => toast(t('common', 'comingSoon'))
                            : undefined
                        }
                      >
                        {entry.to !== undefined ? (
                          <Link to={entry.to}>{entry.text}</Link>
                        ) : (
                          entry.text
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="gap-2 px-2 pb-2">
        {/* 用户区（design §6.2：loading 骨架 / anon 登录入口 / authed 用户菜单）
            —— 侧栏底部**仅此一项**：原产品元信息三项（Star on GitHub / 使用文档·提交反馈 / 版本行）
            已按批 design §8 + 主 design §4 于 **M4b-2 T5** 整体删除（`navigation` 同步 −4 键） */}
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
