import type { VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { type badgeVariants, Badge as ShadcnBadge } from '@/components/ui/shadcn/badge';

export type BadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

/**
 * AIH `tone` → 官方 `Badge` `variant` **薄映射**（design §3.5）：官方 `badge.tsx` 的 `cva` 增
 * `success`/`warning` 两 variant（用 `--success`/`--warning` token），AIH 侧只保留映射
 * ⇒ **唯一调用点（`VersionCompare`）零改动**。
 * （M4b-5 F156：`DiffNav`/`DiffView` 两件已退役 ⇒ 原「3 个调用点」表述同步收口）
 *
 * 归位后形态以官方为准（`rounded-full` · `px-2 py-0.5` · `text-xs` · `font-medium`）——原自绘
 * `px-[9px] py-[2px] text-[11px] font-semibold` + 半透明底色随之收敛（design §8.7 观感项）。
 */
const VARIANT: Record<BadgeTone, BadgeVariant> = {
  success: 'success',
  warning: 'warning',
  danger: 'destructive',
  info: 'default',
  neutral: 'secondary',
};

/**
 * 状态/类型小徽章（PUBLISHED/YANKED/changeType 各自 tone）。
 *
 * `mono` 保留：sha 截断等场景需等宽字体，官方 `Badge` 无等宽变体 ⇒ 以 `font-mono` 承载
 * （AIH 语义差异，走官方第 ⑤ 条路径「包装组件」；`tone`/`mono`/`children` 契约零变更）。
 */
export function Badge({
  tone = 'neutral',
  mono = false,
  children,
}: {
  tone?: BadgeTone;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <ShadcnBadge variant={VARIANT[tone]} className={mono ? 'font-mono' : undefined}>
      {children}
    </ShadcnBadge>
  );
}
