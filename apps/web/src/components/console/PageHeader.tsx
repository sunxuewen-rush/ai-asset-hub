import type { ReactNode } from 'react';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shadcn/card';

/**
 * 控制台页头（design §5.1）：标题（`text-xl font-semibold`）+ 副述（`text-sm text-muted-foreground`）
 * + 右侧动作槽（`CardAction` 语义）。
 *
 * 组合方式走官方 `Card` 的既定形态：**`CardAction` 置于 `CardHeader` 内**——官方 `CardHeader` 自带
 * `has-data-[slot=card-action]:grid-cols-[1fr_auto]`，标题/副述在左列、动作在右列自动成两栏；
 * **不要**把 `CardAction` 放成 `Card` 的直接子节点（那样会失去官方两栏栅格）。
 *
 * ⚠ 本件**不把 `CardHeader` 放进 flex 行**：`CardHeader` 带 `@container/card-header`
 * （`container-type: inline-size`），作为 flex item 时自动宽度会塌陷（T2 回归实证）——见 `CenterPage.tsx` 注释。
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  /** 右侧动作槽（按钮/链接等） */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className ?? 'mb-4'}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
    </Card>
  );
}
