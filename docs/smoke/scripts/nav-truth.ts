/**
 * 侧栏导航**真值件**（F221 · 2026-09-24）—— 断言侧「**不写死条数**」的唯一来源。
 *
 * 为什么需要它：M4b-2 的三个 dogfood/验收脚本把「侧栏条目数」「组集合」「图标序列」写成了常量
 * （14 条 / 管理组 2 条 / §14.6 图标表…）。后续批（M4b-4 加「我的资产/我的提交/访问令牌」、
 * M4b-6 加「管理看板/资产管理/标签定义」、T11-i 加**侧栏搜索触发器**）逐次演进 ⇒ 这些常量**必然过期**
 * （实测 18 条断言红，与 F219/F220 同族：断言写「历史记忆」而非真值）。
 *
 * 本件把真值**从 SSOT 现算**：`apps/web/src/components/ui/navItems.tsx`（该文件自述 = 导航清单**单一事实源**，
 * `SideNav` 与 `CommandPalette` 同用）。解析产物 = 门户条数 + 每组（门槛 / 条目 / 占位 / 图标）。
 *
 * 约定：
 * · **门户 4 条恒可见**（首页 + 三中心）；三组按 `gate` 显隐（`'authed'` / 10 = ADMIN / 100 = SUPER_ADMIN）
 * · **占位条目** = 无 `to` 的条目（渲染为 `<button>` + 轻提示）
 * · 图标：`lucide-*` 由组件名转 kebab；`TypeIcon` 原样（资产类型图标，非 lucide）
 * · **侧栏搜索触发器**（T11-i B″）带 `aria-haspopup="dialog"` ⇒ 断言侧须把它与导航条目分开计
 */
import { readFileSync } from 'node:fs';

const SRC = new URL('../../../apps/web/src/components/ui/navItems.tsx', import.meta.url);

export interface NavEntryTruth {
  /** DOM 侧会看到的图标标识（`lucide-*` / `TypeIcon`） */
  icon: string;
  /** 有 `to` ⇒ 真链接（`<a>`）；无 ⇒ **占位条目**（`<button>` + 轻提示） */
  hasTo: boolean;
}

export interface NavGroupTruth {
  labelKey: string;
  /** 侧栏渲染的组标题（zh） */
  zhLabel: string;
  gate: 'authed' | number;
  entries: NavEntryTruth[];
}

export interface NavTruth {
  portalCount: number;
  groups: NavGroupTruth[];
}

/** 组标题（zh）—— 与 `SideNav.tsx` 的 `labelKey → t('navigation', …)` 对应 */
const ZH: Record<string, string> = {
  groupPersonal: '个人',
  groupAdmin: '管理',
  groupSuperAdmin: '超级管理',
};

/** 门槛常量（对齐 `apps/web/src/auth/roles.ts`） */
export const NAV_ROLE = { ADMIN: 10, SUPER_ADMIN: 100 } as const;

/** PascalCase → kebab（`LayoutDashboard` → `layout-dashboard`） */
function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** DOM 侧图标标识（`TypeIcon` 例外：非 lucide） */
function iconId(component: string): string {
  return component === 'TypeIcon' ? 'TypeIcon' : `lucide-${kebab(component)}`;
}

let cached: NavTruth | null = null;

export function navTruth(): NavTruth {
  if (cached) return cached;
  const src = readFileSync(SRC, 'utf8');
  const portalBlock = src.slice(src.indexOf('portal: ['), src.indexOf('groups: ['));
  const portalCount = (portalBlock.match(/\bto:\s*'/g) ?? []).length;
  const groups = src
    .slice(src.indexOf('groups: ['))
    .split(/labelKey: '/)
    .slice(1)
    .map((chunk) => {
      const labelKey = chunk.slice(0, chunk.indexOf("'"));
      const gateRaw = (/gate:\s*([^,\n]+)/.exec(chunk)?.[1] ?? '').trim();
      const gate: 'authed' | number = gateRaw.includes('SUPER_ADMIN')
        ? NAV_ROLE.SUPER_ADMIN
        : gateRaw.includes('ADMIN')
          ? NAV_ROLE.ADMIN
          : 'authed';
      const entries = [...chunk.matchAll(/\{[^{}]*\}/g)].map((m) => {
        const block = m[0];
        const icon = /icon:\s*<([A-Za-z]+)/.exec(block)?.[1] ?? 'TypeIcon';
        return { icon: iconId(icon), hasTo: /\bto:\s*'/.test(block) };
      });
      return { labelKey, zhLabel: ZH[labelKey] ?? labelKey, gate, entries };
    });
  cached = { portalCount, groups };
  return cached;
}

/** 该角色可见的组（`'authed'` 组 = 任何登录用户） */
function visibleGroups(role: number | 'anon'): NavGroupTruth[] {
  return navTruth().groups.filter((g) => {
    if (role === 'anon') return false;
    if (g.gate === 'authed') return true;
    return role >= g.gate;
  });
}

/** 侧栏**导航条目**总数（不含搜索触发器） */
export function navItemTotal(role: number | 'anon'): number {
  const t = navTruth();
  const portal = role === 'anon' ? t.portalCount : t.portalCount;
  return portal + visibleGroups(role).reduce((n, g) => n + g.entries.length, 0);
}

/** 各组条数（zh 组名 → 条数）—— 与 DOM 的 `sidebar-group-label` 对齐 */
export function navGroupCounts(role: number | 'anon'): Record<string, number> {
  const t = navTruth();
  const out: Record<string, number> = { 门户: t.portalCount };
  for (const g of visibleGroups(role)) out[g.zhLabel] = g.entries.length;
  return out;
}

/** 完整图标序列（门户 4 条 + 三组，按渲染顺序；不含搜索触发器） */
export function navIconSequence(): string[] {
  const t = navTruth();
  // 门户：首页 = lucide-house，其余三中心 = TypeIcon（资产类型图标）
  const portal = ['lucide-house', 'TypeIcon', 'TypeIcon', 'TypeIcon'];
  return [
    ...portal.slice(0, t.portalCount),
    ...t.groups.flatMap((g) => g.entries.map((e) => e.icon)),
  ];
}

/** 占位条目（无 `to`）所属组 —— 供「点占位出轻提示」类断言定位 */
export function navPlaceholderGroups(): string[] {
  return navTruth()
    .groups.filter((g) => g.entries.some((e) => !e.hasTo))
    .map((g) => g.zhLabel);
}

/** 指定组的占位条目数 */
export function navPlaceholderCount(zhLabel: string): number {
  const g = navTruth().groups.find((x) => x.zhLabel === zhLabel);
  return g ? g.entries.filter((e) => !e.hasTo).length : 0;
}
