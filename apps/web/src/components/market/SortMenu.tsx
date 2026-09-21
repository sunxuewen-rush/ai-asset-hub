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
import { useI18n } from '../../i18n/I18nProvider.js';
import { isSortKey, SORT_LABEL_KEYS, SORT_OPTIONS, type SortKey } from './sortOptions.js';

/**
 * 门户「排序」入口（T11-j `j6` · 2026-09-21 用户拍板 **方向 1「纯图标」**）。
 *
 * 形态：官方 `Button`（`variant="ghost"` + `size="icon-sm"` = **32×32 · 无框**，与左邻「列显示」、
 * 右邻「搜索」同一族）+ lucide `ArrowUpDown` + 官方 `DropdownMenu`（**radio 三档**，当前档打勾）。
 *
 * 取代 T11-f 的官方 `Select`（**160px ⇒ 32px** · 工具条省 128px）—— 换案依据 = 选型矩阵里
 * **已登记**的那一案（`shadcn-ui-v4-adoption` → `sorting-control-selection-and-v9-manual-correction.md` §4：
 * 「最省（32px）· 档位可无限加 · 与官方列头下拉同族 / 2 次点击 · **当前档位不可见**」）。
 * ⇒ 代价由 **tooltip（悬停显示当前档）+ 菜单勾选**补足；**排序语义零变化** —— 换档仍只写 `sort`
 * （方向 `dir` 与「首点 desc」两态依旧归**列头**承担，`useMarketQuery.setSort` 一字未改）。
 */
export function SortMenu({
  value,
  onChange,
  className,
}: {
  value: SortKey;
  onChange: (next: SortKey) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const label = t('market', 'sortLabel');
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
                <ArrowUpDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {/* 无框 + 纯图标 ⇒ 「当前档」只能靠悬停与菜单勾选表达（选型矩阵已登记的代价） */}
          <TooltipContent>{`${label} · ${t('market', SORT_LABEL_KEYS[value])}`}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (isSortKey(next)) onChange(next);
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {t('market', SORT_LABEL_KEYS[option])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
