import { Columns3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/shadcn/tooltip';

/**
 * 「列显示」入口（统一件 · **跨页共享** · 门户 + 控制台同一形态）。
 *
 * 由来：`T11-j · j6` 建于 `components/market/`（门户专属）；`T11-k · k1` 控制台「我的资产」
 * 成为**第二个消费方** ⇒ 按分层归位 `components/ui/`（与 `DataTable` / `AssetAvatar` 同层）。
 * 归位同时**解除字典组耦合**：件内不再自己取 i18n ⇒ 列名与两处固定文案**由调用方解好传入**
 * （门户用 `market.*` · 控制台用 `assets.*`，各自复用既有键）。
 *
 * 形态（`j6` 线框三案对比后拍板 = **V1 钮 + M-A 菜单**）：
 * - **V1**：官方 `Button`（`variant="ghost"` + `size="icon-sm"` = **32×32 · 无框**）+ lucide
 *   `Columns3`（**SVG** · 仓规「图标一律 SVG」）+ 官方 `Tooltip`（无障碍名同 `CopyButton` 先例）
 * - **M-A**：菜单列**全部项**（用户看得到"有哪几列"），**保护列置灰**并标「必显」+ 分隔线 + 「重置为默认」
 * - 受控：本件**不自持状态**（`value` / `onChange` 由页面给）；**不持久化** ⇒ 刷新 / 切换视图回到全显示
 *
 * 位置口径（`j6` 定死 · 控制台跟齐）：放**页面工具条**的表格内容控件群（门户 = 紧贴排序左侧；
 * 控制台 = 搜索框右侧）。「选中列数」由**角标**表达（可选能力，见 `badgeCount`）。
 */
export type ColumnToggleItem = {
  /** 列 id（= TanStack 列 `id` / `accessorKey`）；动作槽列传哨兵 id ⇒ 天然不可隐藏 */
  key: string;
  /** 菜单里的列名（**调用方已解 i18n** —— 本件不绑字典组） */
  label: string;
  /** 是否可隐藏；保护列写 `false` ⇒ 置灰 + 标「必显」 */
  hidable: boolean;
};

export function ColumnVisibilityMenu({
  items,
  value,
  onChange,
  label,
  labels,
  badgeCount,
  className,
}: {
  items: ReadonlyArray<ColumnToggleItem>;
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  /** 触发钮无障碍名 + tooltip 文案 */
  label: string;
  /** 菜单内两处固定文案（调用方给 —— 复用既有键，零新增） */
  labels: { required: string; reset: string };
  /** 已隐藏列数（> 0 时触发钮右上显示角标 —— 无框图标钮的「有值」表达） */
  badgeCount?: number;
  className?: string;
}) {
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
                aria-label={label}
              >
                <Columns3 aria-hidden />
                {badgeCount && badgeCount > 0 ? (
                  <span
                    aria-hidden
                    className="-top-1 -right-1 absolute inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground leading-none"
                  >
                    {badgeCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-[190px]">
        {items.map((item) => (
          <DropdownMenuCheckboxItem
            key={item.key}
            checked={value[item.key] !== false}
            disabled={!item.hidable}
            /* 勾选**不关菜单**（可连点多项 —— 官方 `CheckboxItem` 缺省会关闭） */
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => onChange({ ...value, [item.key]: checked })}
          >
            {item.label}
            {item.hidable ? null : (
              <span className="ml-auto text-muted-foreground text-xs">{labels.required}</span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange({})}>
          <RotateCcw aria-hidden />
          {labels.reset}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
