import { SortMenu as SortControl } from '@/components/ui/SortMenu';
import { useI18n } from '../../i18n/I18nProvider.js';
import { SORT_LABEL_KEYS, SORT_OPTIONS, type SortKey } from './sortOptions.js';

/**
 * 门户「排序」入口 —— **市场值域适配**（显示形态 = `ui/SortMenu` 统一件）。
 *
 * 历史：`T11-j · j6` 本件即显示实现（官方 `Button` 32px 纯图标 + `DropdownMenu` radio 三档 ·
 * 用户 2026-09-21 拍板「方向 1」）；**M4c-2 v0.10（T9）** 用户管理页成为**第二个消费方** ⇒
 * 显示实现归位 `components/ui/SortMenu.tsx`（**同 `ColumnVisibilityMenu` 路径**），本件退化为
 * **值域 + 文案适配**：三档（`newest` / `downloads` / `stars`）与 `market.*` 标签在此解好传入。
 *
 * **签名与行为一字不变** ⇒ 4 处消费点（`CenterPage` · `Search` · `Assets` · `AdminAssets`）**零改**；
 * 值域守卫（非法值忽略）随显示实现一同下沉到统一件。**排序语义零变化** —— 换档仍只写 `sort`
 * （方向 `dir` 与「首点 desc」两态依旧归**列头**承担）。
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
  return (
    <SortControl
      value={value}
      options={SORT_OPTIONS}
      labelOf={(option) => t('market', SORT_LABEL_KEYS[option])}
      ariaLabel={t('market', 'sortLabel')}
      onChange={onChange}
      className={className}
    />
  );
}
