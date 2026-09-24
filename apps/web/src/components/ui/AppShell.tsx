import { type CSSProperties, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/shadcn/sidebar';
import { CommandPalette } from './CommandPalette.js';

import { SideNav } from './SideNav.js';
import { TopBar } from './TopBar.js';

/**
 * 应用壳（design §3 v0.3 定稿：顶栏通用 + 侧栏功能 + 内容区；底部开源出口归侧栏）
 *
 * 换皮（plan T4，design §4.4）：布局改 Tailwind 工具类；移除 `bg-glow` 氛围光斑节点。
 * 侧栏收起（plan T7b，design v0.12）：`SidebarProvider` 包裹（`flex-col` 保「顶栏通用」布局——
 * 顶栏仍横跨全宽，侧栏在其下方），并用 `style` 覆盖 2 个宽度变量：
 *   · `--sidebar-width: 256px`（**2026-09-17 用户拍板·对齐官方 16rem**；原 AIH 值 204px）
 *   · `--sidebar-width-icon: 48px`（图标轨，= 官方 3rem）
 * 结构与路由零变更。
 *
 * **2026-09-17 用户拍板（选 B）：结构改官方形态** —— `SidebarProvider > SideNav + SidebarInset`
 * （顶栏移入 `SidebarInset` 内）⇒ **顶栏不再横跨全宽**（宽度 = 内容区宽 = 视口 − 侧栏宽）；
 * `SidebarProvider` 去掉 `className="flex-col"`（该覆盖原为「全宽顶栏」服务，现不需要）；
 * 侧栏随之回到官方 `inset-y-0`（**去掉 `top-[58px] bottom-0 h-auto` 定位覆盖**）⇒ AIH 覆盖点由 2 处降为 **1 处**
 * （仅剩两个宽度变量）。官方件 `SidebarInset` 自带 `flex w-full flex-1 flex-col bg-background`。
 *
 * v0.18（用户拍板「hero 上下与 sidebar 上下一致」）：`main` 纵向内边距由 `pt-4 pb-9`（16 / 36）
 * 改为 **`py-2`（8 / 8）**——与 sidebar 浮层面板的 `p-2`（8px）gutter 对齐。实测：侧栏面板
 * `66 → 892`（h 826），main 内容区同为 `66 → 892`。**副作用（已登记）**：中心页 / 详情页
 * 顶部间距 16 → 8、底部 36 → 8——原 16/36 是换皮前的旧值，并非为「浮层侧栏」设计，故一并对齐；
 * **T21 / T22 已完成两页换皮，该副作用随之收敛**（2026-09-11 二轮审计更新表述）。
 * v0.18b（去硬编码）：`main` 加 **`flex min-h-[calc(100vh-58px)] flex-col`** —— 「撑满一屏」的职责
 * 由「hero 自己算 `100vh - 74`（58+8+8）」改为「**壳撑满 + 页面用 `flex-1` 顶满**」。收益：`74` 这个
 * **派生和**被消除（顶栏高或 gutter 一改，旧的 `calc(100vh-74px)` 会静默错位且不报错），现在只剩
 * **`58` 一个常量**（顶栏高，§4.4 ⑥ 定值），8px gutter 由 flex 自动吃掉。观感零变化（实测同值）。
 * 移动端未考虑（用户 2026-09-11 明确「先不用考虑移动端」→ `100vh` 保持不动，不引 `svh/dvh`）。
 */
/** 侧栏开合 cookie（官方 `SIDEBAR_COOKIE_NAME` / max-age 7d 同值；受控模式下由本件写入） */
const SIDEBAR_COOKIE = 'sidebar_state';
const WIDTH_EXPANDED = '256px'; // 官方 16rem（2026-09-17 用户拍板对齐官方；原 AIH 值 204px）
const WIDTH_ICON = '48px'; // 官方 3rem（图标轨）
const HEADER_HEIGHT = '58px'; // 顶栏高（AIH 定值 §4.4 ⑥；官方 SiteHeader 亦以变量承载）

function readSidebarOpen(): boolean {
  const m = document.cookie.match(/(?:^|;\s*)sidebar_state=([^;]+)/);
  return m ? m[1] === 'true' : true;
}

export function AppShell() {
  /**
   * **受控开合**（2026-09-17）：官方件用 `group-data-[collapsible=icon]:w-(--sidebar-width-icon)`
   * 定义图标轨宽度，但 **Tailwind v4 未生成该规则**（实测 CSSOM 命中 0 条，即 M4b-2 **F4 遗留项**的真因）
   * ⇒ 图标态改由**状态驱动**：`--sidebar-width` 随 `open` 在 256px / 48px 间切换（官方 `w-(--sidebar-width)`
   * 规则可用）。cookie 与官方同名同 max-age，保持刷新后状态恢复。
   */
  const [open, setOpen] = useState(readSidebarOpen);
  /**
   * 命令面板开合（**T11-i B″** · M4a design §8.13）：入口两处 —— **侧栏框样触发器**（`SideNav`
   * 的 `onOpenPalette`）与 **`⌘K` / `Ctrl+K`**（本节监听）。监听挂**壳层一处**（与侧栏 `⌘B`
   * 同族），不分散到各页。`preventDefault` 防浏览器默认行为（Chrome 的 ⌘K 有内置动作）。
   */
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // writes 侧不能走 Cookie Store API —— `cookieStore` 至今仅 Chromium 系支持（Safari/Firefox 未实现）
    // ⇒ `document.cookie` 是唯一跨浏览器写面；且这是官方 shadcn `SidebarProvider` 同款做法
    // （`sidebar_state` cookie 持久化折叠态，读侧见 `readSidebarOpen()`）。
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API 非跨浏览器实现（理由见上）
    document.cookie = `${SIDEBAR_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 7}`;
  };
  return (
    <SidebarProvider
      open={open}
      onOpenChange={handleOpenChange}
      style={
        {
          '--sidebar-width': open ? WIDTH_EXPANDED : WIDTH_ICON,
          '--sidebar-width-icon': WIDTH_ICON,
          // 顶栏高度（官方 `blocks/dashboard-01` SiteHeader 用 `--header-height` 变量驱动）
          '--header-height': HEADER_HEIGHT,
        } as CSSProperties
      }
    >
      <SideNav onOpenPalette={() => setPaletteOpen(true)} />
      <SidebarInset>
        <TopBar />
        <div className="flex min-h-[calc(100vh-58px)] min-w-0 flex-1 flex-col px-[22px] py-2">
          <Outlet />
        </div>
      </SidebarInset>
      {/* 命令面板（Dialog 形态 · 渲在壳层一处 ⇒ 全站可达） */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  );
}
