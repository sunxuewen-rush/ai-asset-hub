import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';
import type * as React from 'react';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        /**
         * AIH 站点级补丁（design §3.5，官方第 ④ 条路径「改组件源码加 variant」）：
         * 语义色走 `--success`/`--warning` token（`aih-theme.css` @theme 已注册
         * `--color-success-foreground`/`--color-warning-foreground`），样式与官方 `destructive`
         * 同构（实底 + 前景色 + hover 90%）；**不逐点用 className 覆盖颜色**。
         */
        success: 'bg-success text-success-foreground [a&]:hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground [a&]:hover:bg-warning/90',
        /**
         * 状态渐变补丁（M4b-3 批 design D12 / §3.2#7，v1.14，用户拍板）：review task「已驳回」徽章
         * —— 实底**蓝→紫渐变 + 白字**（与 `success` 实底绿 + 白字**同构**，**去红**，对标 skillhub
         * `--brand-gradient`）。渐变**值**只住 `aih-theme.css` C 层（`--gradient-rejected`），此处仅
         * **引用** token；**不注册** `@theme --color-*` 映射（渐变值塞 `background-color` 不成立 ⇒ 注册即静默失效）。
         */
        rejected: 'bg-[image:var(--gradient-rejected)] text-white [a&]:hover:brightness-105',
        secondary: 'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90',
        outline:
          'border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        ghost: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
      },
      /**
       * AIH 站点级补丁（官方第 ④ 条路径「改组件源码加 variant」· M4a 挂账项 24 收口 2026-09-28）：
       * 标签 pill 盒模型 —— 在官方默认 `px-2 py-0.5 text-xs` 之上补两档，沿用 M4a 时代自绘 pill
       * 真值（详情档 `px-3 py-[3px]` · 列表紧凑档 `px-2 py-[1px]`），字阶 11px（design §4.4 轴内值）
       * ⇒ **不逐点用 className 覆盖尺寸**。`default` 档保持官方原样（空串 ⇒ base 值生效）。
       *
       * ⚠️ 与 base 的 `px-2 / py-0.5 / text-xs` 属同属性撞车 ⇒ 生效与否由**样式表定序**决定
       * （同 `toggle.tsx` chip variant 的实测结论，与 class 书写顺序无关）；本仓以 dogfood 的
       * class 契约断言（`m4a-dogfood` 的 pill 组）守门，改 Tailwind 版本后须复跑。
       */
      size: {
        default: '',
        chip: 'px-3 py-[3px] text-[11px]',
        'chip-sm': 'py-[1px] text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-size={size ?? 'default'}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
