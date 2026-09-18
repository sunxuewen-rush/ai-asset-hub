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
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
