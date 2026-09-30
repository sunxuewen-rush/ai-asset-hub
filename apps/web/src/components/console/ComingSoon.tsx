import { Construction } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/shadcn/empty';

/**
 * 占位页（批 design §5.4 · Q6/Q7）——「不白屏」的过渡形态。
 *
 * 官方件族落位（`shadcn/empty.tsx` 导出 6 件）：`Empty` > `EmptyHeader`（`EmptyMedia variant="icon"`
 * + `EmptyTitle` + `EmptyDescription`）；**内容槽 = `EmptyContent`**（`/dashboard` 的入口按钮组放此处）。
 *
 * **两种用法（同件不同 props）**：① 占位路由只传 `title`/`description`（中性文案，无 `EmptyContent`）
 * ② `/dashboard` 传 `children` 内容槽（欢迎语 + 入口按钮组，M4b-4 换三卡）。
 *
 * **DEV 批次号（2026-09-30 整体审计订正 · F259）**：`main.tsx` 的 `DEV_BATCH` 常量表**已随 M4b-6 清空**，
 * 本件`batch` prop 因此**零调用点** ⇒ 已删（含渲染分支）。生产产物零 `M4b-` 字面量的纪律由 gating 常量承担，
 * 与占位页文案无关（公开仓纪律）。
 *
 * **不发任何业务请求**（主 design P1-P5：不预埋空业务页）。
 */
export function ComingSoon({
  title,
  description,
  children,
}: {
  /** 页标题（调用点传 `t(...)` 结果，语言切换随上下文重渲染） */
  title: string;
  /** 中性描述（缺省不渲染该行） */
  description?: string;
  /** DEV-only 批次号（如 `M4b-3`）——调用点必须经 `import.meta.env.DEV` 门控 */
  /** 内容槽（落官方 `EmptyContent`）——`/dashboard` 用 */
  children?: ReactNode;
}) {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Construction />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}
