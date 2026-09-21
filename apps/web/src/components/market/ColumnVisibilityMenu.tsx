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
import { type DictKey, useI18n } from '../../i18n/I18nProvider.js';

/**
 * 门户「列显示」入口（T11-j `j6` · 跨批 design §2.8 —— **D7 的 A 案位置**：工具条 · **紧贴排序左侧**）。
 *
 * 形态（2026-09-21 线框三案对比后拍板 **V1 + M-A**）：
 * - **V1**：官方 `Button`（`variant="outline"` + `size="icon-sm"` = **32×32** ⇒ 与同排的排序
 *   `Select`（32 高）/ 搜索钮 / 视图切换**同高**）+ lucide `Columns3`（**SVG** —— 仓规「图标一律 SVG」）
 * - **M-A**：菜单列**全部 7 项**（列名齐全 ⇒ 用户看得见"有哪几列"），**保护列置灰**并标「必显」
 *   （`hidable: false`）+ 分隔线 + 「重置为默认」
 *
 * 受控：本件**不自持状态**（`value` / `onChange` 由页面给）；**不持久化** —— 与「视图切换不记忆」同口径
 * （刷新 / 切页回来 ⇒ 回到全显示）。
 *
 * 无障碍：触发钮名由调用方传（同 `CopyButton` 先例）；本件自带 `TooltipProvider`（不要求 App 根改造）。
 */
export function ColumnVisibilityMenu({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: ReadonlyArray<{ key: string; labelKey: DictKey<'market'>; hidable: boolean }>;
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  /** 触发钮无障碍名 + 悬停提示文案（i18n 在消费点） */
  label: string;
  /** 透传触发钮（门户两处用它承接 `ml-auto` —— 使本钮成为右侧控件群首项） */
  className?: string;
}) {
  const { t } = useI18n();
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
            /* 勾选**不关菜单**（可连点多项 —— 官方 `CheckboxItem` 缺省勾完即关） */
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(checked) => onChange({ ...value, [item.key]: checked })}
          >
            {t('market', item.labelKey)}
            {!item.hidable && (
              <span className="ml-auto text-xs text-muted-foreground">
                {t('market', 'colRequired')}
              </span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange({})}>
          <RotateCcw aria-hidden />
          {t('market', 'colReset')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
