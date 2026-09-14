import { type ReactNode, useState } from 'react';
import { Card } from '@/components/ui/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/shadcn/tabs';
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
 * 详情 Tab 卡（design §4.4；plan T17 换皮 · **M4b-1 T3 归位官方 `Tabs`**）
 *
 * 卡壳 = 官方 `Card`（T2，`overflow-hidden gap-0 py-0` + AIH 内距）。
 *
 * T3 归位（design §3.3）：自绘 `role=tablist/tab/tabpanel` + 手挂绝对定位激活线
 * → 官方 `Tabs`（`TabsList variant="line"` + `TabsTrigger` + `TabsContent`）：
 * - **行为增强**：键盘左右切换（Radix roving focus，`activationMode` 默认自动）· `aria-controls` /
 *   `aria-labelledby` 由 Radix 自动接线（原自绘件无）
 * - **`TabsContent` 加 `forceMount`**：三面板常驻挂载 ⇒ ① 切换**保留面板内状态**（如版本对比的
 *   基/目标选择）② 切走再切回**零重拉**（useApi 缓存语义不变）
 *   ⚠ **坑（2026-09-14 实测）**：Radix `forceMount` **不下发 `hidden` 属性**（实测三面板
 *   `display:block` 全可见、叠高 —— 页面明显损坏）⇒ 必须由消费方补 `data-[state=inactive]:hidden`
 *   （本件 className 已补；`hidden` 同时修掉「非激活面板进入 a11y 树」的问题）
 * - **激活指示覆盖为 AIH 真值**（design §3.3）：实底 `--primary` 2px 下划线——官方 `line` 变体默认
 *   `after:bg-foreground` / `after:inset-x-0` / `after:bottom-[-5px]`，本件覆盖为
 *   `after:bg-primary` / `after:inset-x-2.5` / `after:bottom-[-1px]` / `after:h-0.5`
 * - 字阶与未激活色沿 AIH（`text-[13px] font-semibold` / `text-muted-foreground`；官方默认
 *   `text-sm` / `text-foreground/60` 不引入未登记观感变化）
 *
 * 不变：三 tab 集合与 i18n 键 · 默认激活 `overview` · 面板内容由消费方 `renderPane(tab)` 注入
 * （懒加载数据源仍在 `AssetDetail`，本次不改其取数时机）。
 */
export function DetailTabs({ renderPane }: { renderPane: (tab: DetailTab) => ReactNode }) {
  const { t } = useI18n();
  const [active, setActive] = useState<DetailTab>('overview');
  return (
    <Card className="overflow-hidden gap-0 py-0">
      <Tabs
        value={active}
        onValueChange={(value) => setActive(value as DetailTab)}
        className="gap-0"
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent px-2.5 pt-2"
        >
          {TABS.map(({ key, labelKey }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="h-auto flex-none rounded-none px-4 py-[9px] text-[13px] font-semibold text-muted-foreground after:inset-x-2.5 after:bottom-[-1px] after:h-0.5 after:bg-primary"
            >
              {t('market', labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ key }) => (
          <TabsContent
            key={key}
            value={key}
            forceMount
            className="px-[18px] pt-4 pb-[18px] data-[state=inactive]:hidden"
          >
            {renderPane(key)}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
