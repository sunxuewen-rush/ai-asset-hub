import { cn } from 'cn';
import { House, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/shadcn/sidebar';
import { fetchStats } from '../../api/stats.js';
import { useAuth } from '../../auth/AuthProvider.js';
import { hasRole } from '../../auth/roles.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import { paletteShortcutLabel } from './CommandPalette.js';
import { buildNav, type NavType } from './navItems.js';
import { TypeIcon } from './TypeIcon.js';
import { UserMenu } from './UserMenu.js';

/*
 * 类型色衬底已于 2026-09-17 撤除（用户拍板「14 条全用中性底」）——
 * 门户组原 `bg-tint-*` / `text-type-*` 衬底与三组 `bg-muted` 不一致 ⇒ 统一中性。
 * `--tint-*` / `--type-*` 主题 token **保留**（`aih-theme.css`，资产类型色体系仍在使用场景）。
 */

/**
 * 导航条目图标槽（批 design §14.4 C：图标 **16**（`size-4`）· 槽 **22×22** 圆角居中）。
 *
 * **14 条同款**（2026-09-17 用户拍板「侧栏条目形态统一」）：门户组与三组共用**同一槽规格 + 同一衬底色**
 * ——常态一律中性 `bg-muted`，激活一律 `bg-primary` 实底（原门户组的资产类型色衬底已撤除）。
 */
function IconSlot({ children, className }: { children: ReactNode; className?: string }) {
  // 图标态由 **状态**驱动（不用 `group-data-*` 变体：实测该组合在本仓工具链不稳定）
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground',
        // 展开态：槽 22（图标 16 居中）
        // 收起态（2026-09-17 用户要求「不要两个背景色」）：槽放大到 **32×32 = 整个按钮**
        //   （`-m-2` 抵消按钮 `p-2`）⇒ 衬底色铺满按钮，视觉上只有**一层**底色；
        //   图标 16 仍在正中（槽 32 居中 ⇒ 按钮居中）
        collapsed ? 'size-8 -m-2' : 'size-[22px]',
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * 侧栏导航（批 design §6.1 显隐矩阵 · 主 design §4「入口分层与显隐规则」为唯一源）。
 *
 * **门户组**（首页 + 三中心 + 计数）= **带组标题「门户」的 `SidebarGroup`**（2026-09-17 用户拍板：
 * 原「不加标题」翻转 ⇒ 与三组同构）；内容增量保留（计数 + 英文副标，副标降级 hover tooltip）。
 * 条目形态与三组**完全一致**（行高 32 · 图标槽 22×22 中性衬底 · 宽度 162 · 单行）。
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
 * **F3 登记（混排结构视觉，已闭环）**：门户组原为裸 `SidebarMenu`、三组为 `SidebarGroup` ⇒ 2026-09-17
 * 用户拍板：门户组**并入 `SidebarGroup` 并加组标题「门户」**，四组结构自此同构；条目级规格
 * （行高 32 · 槽 22×22 中性衬底 · 宽度 162 · 字号 14 · 字重循官方默认）实测 14 条逐项相同。
 *
 * 收起/展开（plan T7b，design v0.12）：接入 shadcn `Sidebar` 原语——`collapsible="icon"`（收起为 48px
 * 图标轨、悬停出 tooltip）+ `variant="floating"`（浮起面板）+ `SidebarRail`（右缘可拖/点）；
 * 开合由顶栏 `SidebarTrigger` / `⌘B`·`Ctrl+B` 驱动，状态 cookie 持久化，<768px 自动 Sheet。
 * **AIH 覆盖点**（design §4.4 ③ · 2026-09-17 收敛为 **1 处**）：仅剩展开/图标态宽度变量
 * （`SidebarProvider` 覆盖，见 `AppShell.tsx`）。定位覆盖 `top-[58px] bottom-0 h-auto` 已随结构改官方形态
 * （`SidebarProvider > SideNav + SidebarInset`）**退役** ⇒ 侧栏回到官方 `inset-y-0`（顶到最上）。
 * 2026-09-17 用户提议「不要套壳」⇒ `variant` 由 `floating` 改为**官方默认 `sidebar`**（实心贴边 · 无圆角/边框/阴影）。
 * 不变：导航条目 / 路由 / 计数逻辑；激活判定改 `useLocation`（原 NavLink 子函数渲染，与 `asChild` 不兼容）。
 *
 * **2026-09-23 F206**：激活判定收敛为**路径精确相等**（删 `navItems.EXACT_MATCH_PATHS`）——
 *   原前缀匹配让分区父项「管理看板」在 `/admin/*` 任一子页与子页**同时高亮**；规则与代价见 `navItems.tsx` 顶部。
 */
export function SideNav({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);
  const { state, role } = useAuth();
  // 侧栏开合由**状态**驱动（2026-09-17：实测本仓工具链下 `group-data-[collapsible=icon]` 类
  // 在部分节点不稳定 ⇒ 条目收窄/文字隐藏统一用 `collapsed` 判定，避免"某些条目没收缩"）
  const { state: sideState } = useSidebar();
  const collapsed = sideState === 'collapsed';
  /**
   * 导航清单（**单一事实源** = `navItems.buildNav` · T11-i B 上提）：文案在组件内求值（语言切换随
   * 上下文重渲染）；`to` 缺省 = 占位条目。门槛同源（`authed` / `hasRole` 档位）。
   * 命令面板 `CommandPalette` 消费**同一份**清单 ⇒ 不复制第三份路由表（design §8.13 ③）。
   */
  const { portal: entries, groups: navGroups } = buildNav(t);

  const countOf = (type: NavType): number | undefined =>
    type === 'home' ? undefined : stats?.typeCounts[type];

  /**
   * 激活判定 = **路径精确相等**（**F206** 收敛口径 · 规则与代价见 `navItems.tsx` 顶部注释）。
   * 原「`EXACT_MATCH_PATHS` 精确 + 其余前缀」在分区父项 `/admin` 上双亮 ⇒ 改为全精确。
   */
  const isActive = (to: string): boolean => pathname === to;

  // variant = 官方默认 `sidebar`（实心贴边 · 无圆角/边框/阴影 = 「不套壳」——2026-09-17 用户提议）
  return (
    <Sidebar collapsible="icon">
      {/* ── 侧栏顶部品牌区（2026-09-17 对齐官方骨架：品牌由顶栏移入侧栏，官方 `SidebarHeader` 形态）──
          常态 = 渐变字标（照真仓 `TopBar` 原款 17px/700）；图标态 = 渐变小方块（首字母，同设备页品牌块）。 */}
      {/* ── 侧栏顶部品牌区（2026-09-17 对齐官方骨架：品牌由顶栏移入侧栏，官方 `SidebarHeader` 形态）──
          常态 = 渐变字标（照真仓 `TopBar` 原款 17px/700）；图标态 = 渐变小方块（首字母，同设备页品牌块）。
          ⚠️ 2026-09-17 晚：曾试「顶/底区自定义底色（对齐滚动条轨道 → 对齐顶栏白带）」两版，
             **用户要求还原** ⇒ 顶/底恢复为**无自定义底色**（继承侧栏面板底 `--sidebar` `#f6f9ff`）。
             （同日保留项只有一条：滚动条**轨道不再铺色** —— 见 `aih-theme.css` 的 `scrollbar-color` 第二值 `transparent`。） */}
      <SidebarHeader>
        <Link
          to="/"
          aria-label="AI X Hub home"
          className="flex h-8 items-center gap-2 px-2 no-underline group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <b className="bg-[image:var(--gradient-brand)] bg-clip-text text-[17px] font-bold tracking-[-0.3px] text-transparent group-data-[collapsible=icon]:hidden">
            AI X Hub
          </b>
          <span className="hidden size-7 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-brand)] text-sm font-bold text-white group-data-[collapsible=icon]:flex">
            A
          </span>
        </Link>
      </SidebarHeader>

      {/* `px-1` 为 AIH 覆盖：**2026-09-17 撤除**（用户要求收起态图标与图标轨**几何居中**）——
          官方 `SidebarGroup` 的 `p-2`(8) 已提供左右内缩；撤除后图标中心 = 面板中心。 */}
      <SidebarContent className="gap-1 pt-1">
        {/* ── 侧栏搜索触发器（T11-i **B″「框样按钮」形态** · 2026-09-20 用户拍板「A」）──
            位置 = **品牌块正下方 / 门户组之前**；形态 = **看起来像常驻输入框的按钮**（放大镜 +
            占位文案 + `⌘K` 徽标），点击 / `⌘K` ⇒ 打开官方 **`CommandDialog` 命令面板**。
            依据 = **shadcn 官方站同款实测配方**（`button[data-slot=dialog-trigger]` · `bg-muted` ·
            `border-none` · `shadow-none` · `justify-start` + 内嵌 `⌘K`）。规格见 M4a §8.13。 */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t('navigation', 'searchEntry')}
                  onClick={onOpenPalette}
                  aria-haspopup="dialog"
                  className={cn(
                    collapsed
                      ? 'size-8'
                      : 'h-8 w-full justify-start gap-2 rounded-lg border-none bg-muted pl-3 font-normal shadow-none',
                  )}
                >
                  <Search className="size-4 text-muted-foreground" strokeWidth={4} />
                  <span className={cn('truncate text-muted-foreground', collapsed && 'hidden')}>
                    {t('navigation', 'palettePlaceholder')}
                  </span>
                  {!collapsed && (
                    <kbd className="ml-auto rounded-sm border border-border px-1.5 py-0.5 font-medium text-[10px] text-muted-foreground">
                      {paletteShortcutLabel()}
                    </kbd>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── 门户组 ──
            2026-09-17 用户拍板两条：① **加组标题「门户」**（原「不加」拍板翻转，与三组同构）
            ② 14 条**全用中性底**（门户原资产类型色衬底撤除）。
            条目形态与三组一致；内容增量保留（类型计数留右侧；hover tooltip 与三组同款 = **纯中文**）。
            ★ 本组自 M4a 落地后首次改动（结构与条目级形态，均经用户拍板）。 */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation', 'groupPortal')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {entries.map(({ type, to, zhLabel }) => {
                const count = countOf(type);
                const active = isActive(to);
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      // 提示语统一为**中文**（与三组同款；原「中文 · 英文」形式按 2026-09-17 用户要求撤除）
                      tooltip={zhLabel}
                      className={collapsed ? 'size-8' : undefined}
                    >
                      {/* `end` = **精确匹配**（与上方 `isActive` 同口径）—— 缺省时 `<NavLink to="/">`
                          在**任意**路径都自认 active（前缀匹配），会与 `data-active` 打架（F206 同源问题） */}
                      <NavLink to={to} end>
                        <IconSlot
                          className={active ? 'bg-primary text-primary-foreground' : undefined}
                        >
                          {type === 'home' ? <House size={16} /> : <TypeIcon type={type} />}
                        </IconSlot>
                        <span className={cn('truncate', collapsed && 'hidden')}>{zhLabel}</span>
                        {count !== undefined && (
                          <span
                            className={cn(
                              'ml-auto text-[11px] font-medium text-muted-foreground/70 tabular-nums',
                              collapsed && 'hidden',
                            )}
                          >
                            {count.toLocaleString()}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
                  {group.entries.map((entry) => {
                    const active = entry.to !== undefined && isActive(entry.to);
                    return (
                      <SidebarMenuItem key={entry.to ?? entry.text}>
                        <SidebarMenuButton
                          asChild={entry.to !== undefined}
                          isActive={active}
                          tooltip={entry.text}
                          onClick={
                            entry.to === undefined
                              ? () => toast(t('common', 'comingSoon'))
                              : undefined
                          }
                          className={collapsed ? 'size-8' : undefined}
                        >
                          {entry.to !== undefined ? (
                            <Link to={entry.to}>
                              <IconSlot
                                className={
                                  active ? 'bg-primary text-primary-foreground' : undefined
                                }
                              >
                                {entry.icon}
                              </IconSlot>
                              <span className={cn('truncate', collapsed && 'hidden')}>
                                {entry.text}
                              </span>
                            </Link>
                          ) : (
                            <>
                              <IconSlot>{entry.icon}</IconSlot>
                              <span className={cn('truncate', collapsed && 'hidden')}>
                                {entry.text}
                              </span>
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
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
