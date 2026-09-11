import type { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/shadcn/sidebar';
import { SideNav } from './SideNav.js';
import { TopBar } from './TopBar.js';

/**
 * 应用壳（design §3 v0.3 定稿：顶栏通用 + 侧栏功能 + 内容区；底部开源出口归侧栏）
 *
 * 换皮（plan T4，design §4.4）：布局改 Tailwind 工具类；移除 `bg-glow` 氛围光斑节点。
 * 侧栏收起（plan T7b，design v0.12）：`SidebarProvider` 包裹（`flex-col` 保「顶栏通用」布局——
 * 顶栏仍横跨全宽，侧栏在其下方），并用 `style` 覆盖 2 个宽度变量：
 *   · `--sidebar-width: 204px`（AIH 值，官方默认 16rem/256px）
 *   · `--sidebar-width-icon: 48px`（图标轨，= 官方 3rem）
 * 结构与路由零变更。
 *
 * v0.18（用户拍板「hero 上下与 sidebar 上下一致」）：`main` 纵向内边距由 `pt-4 pb-9`（16 / 36）
 * 改为 **`py-2`（8 / 8）**——与 sidebar 浮层面板的 `p-2`（8px）gutter 对齐。实测：侧栏面板
 * `66 → 892`（h 826），main 内容区同为 `66 → 892`。**副作用（已登记）**：中心页 / 详情页（未换皮）
 * 顶部间距 16 → 8、底部 36 → 8——原 16/36 是换皮前的旧值，并非为「浮层侧栏」设计，故一并对齐。
 * v0.18b（去硬编码）：`main` 加 **`flex min-h-[calc(100vh-58px)] flex-col`** —— 「撑满一屏」的职责
 * 由「hero 自己算 `100vh - 74`（58+8+8）」改为「**壳撑满 + 页面用 `flex-1` 顶满**」。收益：`74` 这个
 * **派生和**被消除（顶栏高或 gutter 一改，旧的 `calc(100vh-74px)` 会静默错位且不报错），现在只剩
 * **`58` 一个常量**（顶栏高，§4.4 ⑥ 定值），8px gutter 由 flex 自动吃掉。观感零变化（实测同值）。
 * 移动端未考虑（用户 2026-09-11 明确「先不用考虑移动端」→ `100vh` 保持不动，不引 `svh/dvh`）。
 */
export function AppShell() {
  return (
    <SidebarProvider
      className="flex-col"
      style={
        {
          '--sidebar-width': '204px',
          '--sidebar-width-icon': '48px',
        } as CSSProperties
      }
    >
      <TopBar />
      <div className="flex w-full items-start">
        <SideNav />
        <main className="flex min-h-[calc(100vh-58px)] min-w-0 flex-1 flex-col px-[22px] py-2">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
