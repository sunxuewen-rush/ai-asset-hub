import { Card } from '@/components/ui/shadcn/card';
import { Toggle } from '@/components/ui/shadcn/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/shadcn/toggle-group';
import { fetchLabels } from '../../api/labels.js';
import type { LabelDto } from '../../api/types.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.js';

/** 两级组树：parentId null = 根 chips 行；其余 = 子标签行（06 §2.3） */
export function buildLabelRows(labels: readonly LabelDto[]): {
  roots: LabelDto[];
  children: LabelDto[];
} {
  return {
    roots: labels.filter((l) => l.parentId === null),
    children: labels.filter((l) => l.parentId !== null),
  };
}

/** 展示名回退链：displayName → slug（06 §2.3） */
export function labelName(label: LabelDto): string {
  return label.displayName ?? label.slug;
}

/**
 * 两级标签筛选条（demo v0.4 拍板：父级 chips 行 + 子标签行；数据 GET /api/labels（公开），
 * 组树 = parentId null（根）/ 其余（子）；displayName 回退 slug（06 §2.3）。
 * 选中 = 实底 primary（旧「实底渐变」已废弃）；多值 OR（点击切换 URL label 参数）。根行首「全部」= 清空。
 *
 * **形态归位（M4b-1 T7，批 design §6.1 / 拍板 C′；官方硬规则 2「2–7 个选项的切换 → ToggleGroup」）**：
 * - 根行（「全部」+ 根标签，规模有界）= 官方 `ToggleGroup`（`type="multiple"`）+ `ToggleGroupItem`；
 *   子行（数量无上界）= 官方 `Toggle` 逐枚 —— 二者同形，观感与旧自绘 chip 一致（§8.6「形态保持 chip 观感」）。
 * - 「全部」是**清空动作而非组内取值** ⇒ 用官方 `Toggle` 与组并列（避免 sentinel 值与多值语义混淆）；
 *   `pressed = 无任何选中`，与旧观感一致。
 * - chip 外观（胶囊 / 12px / 未选淡蓝面 + 边 / 选中实底 `--primary`）落 **官方 `toggle.tsx` 的
 *   `variant="chip"` + `size="chip"`**（官方第 ④ 条路径「改组件源码加 variant」）——原自绘三段模板串
 *   常量与 `cls(on)` 三元**整段删除**（硬规则 13「条件类用 cn()」在本件
 *   已无适用场景：开/关两态由 variant 的 `data-[state=on]` 承载，全仓模板串条件类归零）。
 * - 组内 `spacing={7}` 与行 `gap-[7px]` 同值（沿用旧 chip 行距）；组 `flex-1 flex-wrap` 使根标签在
 *   剩余宽度内换行（`w-fit` 会让组不换行而溢出）。
 * 不变：两级组树与 `labelName` 回退链 · 根行首「全部」= `onClearAll` · 多值 OR 切换（`onToggle`）·
 * `aria` 无（沿用原状）· 标签源空/未就 → 整条不渲染（优雅降级）· 对外 props 契约零变更。
 */
export function FilterStrip({
  selected,
  onToggle,
  onClearAll,
}: {
  selected: readonly string[];
  onToggle: (slug: string) => void;
  onClearAll: () => void;
}) {
  const { t } = useI18n();
  const { data: labels } = useApi((signal) => fetchLabels({ signal }), []);

  // 标签源空/未就 → 整条不渲染（优雅降级——筛选是增强非必需）
  if (!labels || labels.length === 0) return null;

  const { roots, children } = buildLabelRows(labels);

  /** 根行已选子集（组内取值——`selected` 亦可能含子行 slug） */
  const rootsSelected = roots.map((l) => l.slug).filter((slug) => selected.includes(slug));

  /** `ToggleGroup` 回传「本组新值数组」；对外契约仍是 `onToggle(slug)` ⇒ 取对称差逐项回调 */
  const handleRootsChange = (next: readonly string[]) => {
    const added = next.filter((slug) => !rootsSelected.includes(slug));
    const removed = rootsSelected.filter((slug) => !next.includes(slug));
    for (const slug of [...added, ...removed]) onToggle(slug);
  };

  return (
    <Card className="mb-3.5 flex flex-row items-start gap-3 px-4 py-3">
      <span className="shrink-0 pt-[7px] text-[11px] font-bold tracking-[0.7px] text-muted-foreground uppercase">
        {t('market', 'tagFilter')}
      </span>
      <div className="flex flex-1 flex-col gap-[7px]">
        <div className="flex flex-wrap items-center gap-[7px]">
          <Toggle
            variant="chip"
            size="chip"
            pressed={selected.length === 0}
            onPressedChange={onClearAll}
          >
            {t('market', 'allLabel')}
          </Toggle>
          <ToggleGroup
            type="multiple"
            variant="chip"
            size="chip"
            /* `spacing` 按 v4 间距标度取值（× `--spacing` 0.25rem）⇒ `1.75` = **7px**，
               与行 `gap-[7px]` 同值（实测 `spacing={7}` 会得到 28px；`0` 则触发官方
               `data-[spacing=0]:rounded-none` 破坏胶囊形态） */
            spacing={1.75}
            className="flex-1 flex-wrap"
            value={rootsSelected}
            onValueChange={handleRootsChange}
          >
            {roots.map((label) => (
              <ToggleGroupItem key={label.slug} value={label.slug}>
                {labelName(label)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {children.length > 0 && (
          <div className="flex flex-wrap items-center gap-[7px]">
            {children.map((label) => (
              <Toggle
                key={label.slug}
                variant="chip"
                size="chip"
                pressed={selected.includes(label.slug)}
                onPressedChange={() => onToggle(label.slug)}
              >
                {labelName(label)}
              </Toggle>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
