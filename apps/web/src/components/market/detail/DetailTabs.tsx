import { type ReactNode, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider.js';

export type DetailTab = 'overview' | 'files' | 'versions';

const TABS: ReadonlyArray<{
  key: DetailTab;
  labelKey: 'tabOverview' | 'tabFiles' | 'tabVersions';
}> = [
  { key: 'overview', labelKey: 'tabOverview' },
  { key: 'files', labelKey: 'tabFiles' },
  { key: 'versions', labelKey: 'tabVersions' },
];

/**
 * 详情 Tab 卡（design §4.4；plan T17 换皮）
 *
 * 换皮：玻璃卡 → **白卡**（`rounded-xl` + `shadow-sm`，无边框——与 `AssetCard` 同档）；
 * 激活指示由「底部 2px **蓝青渐变线**」改 **实底 `--primary` 2px**。用绝对定位 `span`
 * 覆盖在容器 `border-b` 之上（而非给按钮加 `border-b-2`——那会让激活项高 1px 抖动）。
 * 字阶收敛 13.5 → **13**；未激活 `text-muted-foreground`（hover → `text-foreground`）。
 * 内容面板去掉原 0.15s `fadein`（目标体系 Tabs 内容无动画；`--animate-rise` 只用于首屏入场）。
 *
 * **不引 shadcn `Tabs` 原语**（同 T11 Pagination 的取舍）：本件是 `renderPane(active)` 回调 +
 * 消费方缓存实现懒加载，与 Radix `TabsContent` 的挂载语义不同——换原语 = 行为变更，超出
 * T17「纯视觉」范围（`shadcn/tabs.tsx` 留给需要其语义的落点，如 M4b）。
 *
 * 行为零变更：`role=tablist / tab / tabpanel` · `aria-selected` · `useState` 激活态 ·
 * i18n 动态键（`t('market', labelKey)`）· 懒加载由消费方（`AssetDetail.renderPane`）承担。
 */
export function DetailTabs({ renderPane }: { renderPane: (tab: DetailTab) => ReactNode }) {
  const { t } = useI18n();
  const [active, setActive] = useState<DetailTab>('overview');
  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-sm">
      <div className="flex gap-1 border-b border-border px-2.5 pt-2" role="tablist">
        {TABS.map(({ key, labelKey }) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              className={`relative cursor-pointer border-0 bg-transparent px-4 py-[9px] text-[13px] font-semibold transition-colors ${
                on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActive(key)}
            >
              {t('market', labelKey)}
              {on && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="px-[18px] pt-4 pb-[18px]" role="tabpanel">
        {renderPane(active)}
      </div>
    </div>
  );
}
