import type { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/shadcn/sheet';

/**
 * 右侧抽屉（design §5.1）：官方 `Sheet` 封装。
 *
 * 规格真值（主 design §6.3 已落值）：**宽 560**（`sm:max-w-[560px]`，覆盖官方 `sm:max-w-sm`=384 ⇒
 * 属**尺寸类 className**，官方允许）· **必带 `SheetTitle`**（硬规则 4：`Dialog`/`Sheet` 必须有 Title ——
 * 本件把它做成必填 props，从类型上挡住遗漏）· 遮罩沿用官方 `bg-black/50` · **零手写 z-index**
 * （`SheetOverlay`/`SheetContent` 自带 `z-50`）。
 *
 * 结构：`SheetHeader`（标题 + 可选副述，带下边框）→ 可滚动正文 → 可选 `SheetFooter`（带下边框）。
 * 关闭钮为官方内置（右上角 ✕）。
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 抽屉标题（必填——硬规则 4） */
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <SheetFooter className="border-t border-border p-4">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
