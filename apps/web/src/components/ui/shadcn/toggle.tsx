import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Toggle as TogglePrimitive } from 'radix-ui';

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
        /**
         * AIH 站点级补丁（M4b-1 批 design §6.1 / 拍板 C′，官方第 ④ 条路径「改组件源码加 variant」）：
         * 筛选条 chip 形态（`market/FilterStrip`）——圆角胶囊 + 未选淡蓝面 / 选中实底 `--primary`
         * （视觉真值见 M4a §4.4；不逐点用 className 覆盖颜色与排版）。
         *
         * `rounded-full!` 与 **hover 全组**的必要性（**均为实测结论**，非推测）：
         * ① 官方 base 的 `rounded-md` 与本 variant 同属性撞车时由**样式表定序**决定（与 class 书写顺序
         *    无关），实测二者并存恒取 `rounded-md`(8px)；其余属性实测天然取胜（`text-xs` > base
         *    `text-sm` · `transition-colors` > base `transition-[color,box-shadow]`）。
         * ② 官方 base 自带 `hover:bg-muted`/`hover:text-muted-foreground`，与本 variant **同特异性**时按定序
         *    取胜 ⇒ 实测「**选中态 chip 悬停会从实底 `--primary` 翻成灰**」。故 hover 改挂一层
         *    `data-[state=off|on]:`（属性选择器 ⇒ 特异性更高）：实测 `bg` 与 `state=on` 全组均就此取胜，
         *    唯**未选态 hover 字色**仍被 base 压过（Tailwind 按属性分组的组内定序不同）
         *    ⇒ 该处再叠 `!` 收口。目标 = 旧自绘 chip 观感：未选面不变 + 字转 `--primary`；选中态维持实底。
         */
        chip: 'rounded-full! border border-border bg-secondary font-medium text-muted-foreground transition-colors hover:border-ring/40 data-[state=off]:hover:bg-secondary data-[state=off]:hover:text-primary! data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:font-semibold data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground',
      },
      size: {
        default: 'h-9 min-w-9 px-2',
        sm: 'h-8 min-w-8 px-1.5',
        lg: 'h-10 min-w-10 px-2.5',
        /**
         * AIH chip 盒模型（同 ④ 路径）：胶囊内距 + 12px 字阶（沿用原自绘 chip 真值）。
         * 内距取 **`px-3`（12px）** 而非原 13px —— 实测 `ToggleGroupItem` 自带 `px-3` 且与本 variant
         * 的 `px-[13px]` 撞车时原名值取胜 ⇒ 统一到 12px 可让「组内项」与「并列 `Toggle`、子行项」同值
         * （否则同文案 chip 宽差 2px）。
         */
        chip: 'h-auto min-w-0 px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
