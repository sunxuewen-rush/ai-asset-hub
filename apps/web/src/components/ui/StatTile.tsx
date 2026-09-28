/**
 * 页头计数块（页头 `Card` 右侧的「数值 + 说明」小块）。
 *
 * 口径（M4a 挂账项 24 收口 · 2026-09-28）：
 * - 官方 `registry:ui` **无对应件**（官方件族「无 X 件」类判定与 M4b-6 F207 同源口径）
 *   —— 官方示例里的同类块是页面内联布局，非注册表件
 *   ⇒ 走官方第 ⑤ 条路径「包装组件」，抽为**跨面共享件**（先例 = `ui/Badge.tsx`）。
 * - 消费点 **3 处**（`market/CenterPage` · `pages/AdminAudit` · `pages/AdminAssets`）：此前三处
 *   class 串**逐字节相同**（后两处 = M4b-6 新增页时复制的既有页头）：`shrink-0 rounded-xl
 *   border border-border bg-secondary px-5 py-2.5 text-center` —— 本件即该串的单一来源。
 * - `value` / `label` 一律由消费点传入（i18n 与数值格式化留在消费点，本件**零文案零格式化**）；
 *   `value` 支持 `'—'` 占位（载入中/缺数据由消费点决定）。
 * - 位置：`ui/` 而非 `console/` —— 门户面（`market/CenterPage`）与控制台面（`pages/Admin*`）
 *   共同消费，放 `console/` 会让门户反向依赖控制台面。
 * - `className` 为**预留扩展点**（当前 3 处消费均未传 · 零消费者）：保留理由 = 与数据形态
 *   **不耦合**的纯样式槽，官方件同款（`Badge`/`Toggle` 均透传 `className`）⇒ 加档位/微调零改件。
 *   ⚠ **别用 `className` 硬盖颜色**：Tailwind 定序实测 —— `bg-secondary` **晚于** `bg-destructive/5`
 *   ⇒ bg 覆盖**静默失效**；`border-destructive/40` **晚于** `border-border` ⇒ border 覆盖可胜。
 *   需要换色（如 `AdminLabels` 的 warn 警示态）时给本件加 `tone` 轴，勿透传 className。
 */
import { cn } from 'cn';
import type { ReactNode } from 'react';

export function StatTile({
  value,
  label,
  className,
}: {
  /** 主数值（已格式化；载入中/缺数据用 `'—'`） */
  value: ReactNode;
  /** 说明文案（i18n 由消费点解析） */
  label: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-xl border border-border bg-secondary px-5 py-2.5 text-center',
        className,
      )}
    >
      <b className="block text-[22px] leading-tight font-bold text-primary tabular-nums">{value}</b>
      <span className="text-[11px] whitespace-nowrap text-muted-foreground">{label}</span>
    </div>
  );
}
