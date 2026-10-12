import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';

/**
 * 「排序」入口（统一件 · **跨页共享** · 门户 + 控制台同一形态）。
 *
 * 由来：`T11-j · j6` 建于 `components/market/SortMenu.tsx`（门户专属 · 用户拍板方向 1「纯图标」）；
 * **M4c-2 v0.10（T9）** 用户管理页成为**第二个消费方** ⇒ 按分层归位 `components/ui/`
 * —— **与 `ColumnVisibilityMenu` 同一条归位路径**（同一理由、同一形态）。归位同时**解除值域耦合**：
 * 本件不绑档位常量、不自取 i18n ⇒ 档位与文案**由调用方解好传入**（门户三档
 * `newest/downloads/stars`；用户管理四档 `createdAt/username/name/email`，各自复用既有键）。
 * `market/SortMenu.tsx` 保留为**市场值域适配**薄包装（签名不变 ⇒ 4 处消费点零改）。
 *
 * 形态（工具条族：与左邻「列显示」、右邻「搜索」**同一族三连**）：
 * - 官方 `Button`（`variant="ghost"` + `size="icon-sm"` = **32×32 · 无框**）+ lucide `ArrowUpDown`（**SVG**）
 * - 官方 `DropdownMenu`（**radio**：当前档打勾）+ 官方 `Tooltip`（悬停显「排序 · 当前档」）
 * - 受控：本件**不自持状态**（`value` / `onChange` 由调用方给）；**不持久化**
 *
 * ⚠ 已登记的取舍（选型矩阵 `sorting-control-selection-and-v9-manual-correction.md` §4）：32px 最省宽、
 * 档位可无限加，代价 = **当前档位不可见** ⇒ 由 **tooltip（悬停）+ 菜单勾选**补足。旧的 `Select`
 * （160px）形态已下线 —— 全站排序入口只此一套显示实现。
 */
export function SortMenu<T extends string>({
  value,
  options,
  labelOf,
  ariaLabel,
  onChange,
  className,
}: {
  /** 当前档位 */
  value: T;
  /** 全部档位（顺序 = 菜单序） */
  options: readonly T[];
  /** 档位 → 显示文案（**调用方已解 i18n** —— 本件不绑字典组）*/
  labelOf: (option: T) => string;
  /** 无障碍名（工具条族：与「列显示」「搜索」同族） */
  ariaLabel: string;
  onChange: (next: T) => void;
  className?: string;
}) {
  /** 值域守卫：菜单回调给 `string`，非本件档位一律忽略（与旧实现同口径） */
  const isOption = (next: string): next is T => (options as readonly string[]).includes(next);
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={className}
                aria-label={ariaLabel}
              >
                <ArrowUpDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {/* 无框 + 纯图标 ⇒ 「当前档」只能靠悬停与菜单勾选表达（已登记的取舍） */}
          <TooltipContent>{`${ariaLabel} · ${labelOf(value)}`}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (isOption(next)) onChange(next);
          }}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {labelOf(option)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
