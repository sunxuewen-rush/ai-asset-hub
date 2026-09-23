import {
  ClipboardCheck,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Package,
  ScrollText,
  Send,
  Settings,
  Tags,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { AssetType } from '../../api/types.js';
import { ROLE } from '../../auth/roles.js';
import type { Translate } from '../../i18n/I18nProvider.js';

/**
 * 导航清单（**单一事实源** · T11-i B 上提 · 规格 = M4a design **§8.13** ③）
 *
 * 原住 `SideNav.tsx` 内联常量。上提理由 = **侧栏命令面板**（`CommandPalette`）需要同一份
 * 「页面 + 门槛」清单 ⇒ 不复制第三份路由表（§8.13 ③）。
 *
 * · 文案在**调用时**求值（`buildNav(t)`）⇒ 语言切换随上下文重渲染（与上提前同理）
 * · **行为零变化**：`SideNav` 仅把内联定义改成本件调用（其既有断言守）
 */
export type NavType = 'home' | AssetType;

/** 门户组条目（首页 + 三中心）：中文标签 = 展示文案；英文标签 = 收起态 tooltip 备用 */
export interface PortalNavEntry {
  type: NavType;
  to: string;
  zhLabel: string;
  enLabel: string;
}

/**
 * 三组条目：`to` 缺省 = **占位条目**（渲染为 `<button>` + 轻提示，**不建路由、不建页面**）。
 * 图标为 `ReactNode`（沿用上提前形态 ⇒ 侧栏渲染代码零改动）。
 */
export interface NavGroupEntry {
  to?: string;
  text: string;
  icon: ReactNode;
}

export interface NavGroup {
  labelKey: 'groupPersonal' | 'groupAdmin' | 'groupSuperAdmin';
  /** 门槛：`'authed'` = 已登录即可（个人组）· 数字 = `hasRole` 档位 */
  gate: 'authed' | number;
  entries: NavGroupEntry[];
}

/*
 * 激活判定口径 = **路径精确相等**（实现在 `SideNav.tsx`：`pathname === to`；守护断言 = dogfood **G12**
 * 「任一导航路径下**恰 1 条**激活」）。
 *
 * **F206（2026-09-23 用户报 · 已修）**：原实现 = 「`EXACT_MATCH_PATHS`（`/` + `/dashboard`）走精确、
 * 其余走 `pathname.startsWith(to)` 前缀」⇒ **手维护精确集漏掉 `/admin`**（管理组的**分区父项**，子路径
 * `/admin/assets|reviews|audit|labels` 归它管）⇒ 停在任一管理子页时「管理看板」与子页**同时高亮**
 * （用户原话：点「管理看板」再点「资产管理」，「管理看板」还是选中态）。
 *
 * 同一坑 M4b-3 T9④ 已在 `/dashboard` 上踩过一次（当时靠往集合里补 `/dashboard` 止血）⇒ 根因**不是漏一个
 * 路径**，而是「前缀匹配 + 人肉维护精确集」这套形态**必然复发**（第二次了）。故收敛为**全精确匹配**：
 * 删本集合，父子条目互斥、任一路径恰 1 条亮（用户既定口径：父项不在子页常亮）。
 *
 * 代价（显式登记）：将来若新增「子路由要保父项常亮」的路径，需**另立显式规则**（不会再自动靠前缀兜住）。
 * 另：`SideNav` 门户组 `<NavLink>` 同步加 `end` —— 否则其自带 `aria-current` 仍按前缀匹配（同源）。
 */

/**
 * 构建导航清单（门户组 + 三组）。
 *
 * 组级与条目级**同取门槛**：个人组 = `state === 'authed'`（**不依赖 `role`** —— 服务端 `role`
 * 缺省为 `GUEST(0)`，用 `hasRole(role, 1)` 会把未分配角色的登录用户挡在门外，与批 design §6.1 不符）；
 * 管理组 = `hasRole(role, ROLE.ADMIN)`；超级管理组 = `hasRole(role, ROLE.SUPER_ADMIN)`。
 */
export function buildNav(t: Translate): { portal: PortalNavEntry[]; groups: NavGroup[] } {
  return {
    portal: [
      { type: 'home', to: '/', zhLabel: t('navigation', 'home'), enLabel: 'Home' },
      { type: 'skill', to: '/skills', zhLabel: t('navigation', 'skills'), enLabel: 'Skills' },
      { type: 'mcp', to: '/mcps', zhLabel: t('navigation', 'mcps'), enLabel: 'MCP Servers' },
      { type: 'agent', to: '/agents', zhLabel: t('navigation', 'agents'), enLabel: 'Agents' },
    ],
    groups: [
      {
        labelKey: 'groupPersonal',
        gate: 'authed',
        entries: [
          {
            to: '/dashboard',
            text: t('dashboard', 'title'),
            icon: <LayoutDashboard className="size-4" />,
          },
          {
            to: '/dashboard/assets',
            text: t('dashboard', 'myAssets'),
            icon: <Package className="size-4" />,
          },
          {
            to: '/dashboard/submissions',
            text: t('dashboard', 'submissions'),
            icon: <Send className="size-4" />,
          },
          {
            to: '/dashboard/tokens',
            text: t('dashboard', 'tokens'),
            icon: <KeyRound className="size-4" />,
          },
        ],
      },
      {
        labelKey: 'groupAdmin',
        gate: ROLE.ADMIN,
        entries: [
          // 「管理看板」= **真页**（M4b-6 T6：`/admin` 由重定向改为看板页）
          { to: '/admin', text: t('navigation', 'adminBoard'), icon: <Gauge className="size-4" /> },
          {
            // 「资产管理」= **真页**（M4b-6 T7：全站治理列表；M4b-2 只落路由与权限，条目与页面同批落）
            to: '/admin/assets',
            text: t('admin', 'assets'),
            icon: <Package className="size-4" />,
          },
          {
            to: '/admin/reviews',
            text: t('admin', 'reviews'),
            icon: <ClipboardCheck className="size-4" />,
          },
          {
            to: '/admin/audit',
            text: t('admin', 'audit'),
            icon: <ScrollText className="size-4" />,
          },
        ],
      },
      {
        labelKey: 'groupSuperAdmin',
        gate: ROLE.SUPER_ADMIN,
        entries: [
          { to: '/admin/labels', text: t('admin', 'labels'), icon: <Tags className="size-4" /> },
          { text: t('admin', 'settings'), icon: <Settings className="size-4" /> },
          { text: t('admin', 'users'), icon: <Users className="size-4" /> },
        ],
      },
    ],
  };
}
