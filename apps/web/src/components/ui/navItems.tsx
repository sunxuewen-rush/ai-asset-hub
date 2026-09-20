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

/**
 * 精确匹配路径（其余条目按前缀匹配）—— 首页与控制台首页。
 * `/dashboard` 必须精确：它是个人组的**分区父项**（子路径 `/dashboard/assets|submissions|tokens`
 * 归它管）⇒ 前缀匹配会让「工作台」在任一子页与子页**同时高亮**（M4b-3 T9④ 实测）。
 */
export const EXACT_MATCH_PATHS = new Set(['/', '/dashboard']);

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
          // 「管理看板」= **占位条目**（`to` 缺省 ⇒ 轻提示）；页面本体 + `/admin` 路由归 **M4b-6**
          // （批 design §14.7：本批**不改路由表**——`/admin` 维持既有重定向 → `/admin/reviews`）
          { text: t('navigation', 'adminBoard'), icon: <Gauge className="size-4" /> },
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
