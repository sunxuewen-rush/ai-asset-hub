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
 * 筛选 chip 三段（换皮 plan T22，§4.4 SSOT）——模板串拼接（本文件既有风格；不引 `cn`）。
 * 未选中面 = `bg-secondary` + `border-border`（旧 `rgba(255,255,255,.65)` 白衬 + `rgba(37,99,235,.16)`
 * 蓝边 → §4.4 ⑦ `--line-soft` → `--border`；白卡上白衬不可辨故走 AIH 淡蓝面）；
 * hover = 字色 `--primary` + 边 `--ring/40`（旧 `--brand` + `rgba(37,99,235,.4)`）；
 * 选中面 = **实底 `--primary`** + `text-primary-foreground`（旧为 `--grad-brand` 渐变 + 蓝投影，
 * 二者均属 §4.4 废弃项：渐变白名单只回品牌字 / 主 CTA / 页面底三处）。
 */
const CHIP =
  'cursor-pointer rounded-full border px-[13px] py-1 text-xs font-medium transition-colors';
const CHIP_OFF =
  'border-border bg-secondary text-muted-foreground hover:border-ring/40 hover:text-primary';
const CHIP_ON = 'border-primary bg-primary font-semibold text-primary-foreground';

/**
 * 两级标签筛选条（demo v0.4 拍板：父级 chips 行 + 子标签行；数据 GET /api/labels（公开），
 * 组树 = parentId null（根）/ 其余（子）；displayName 回退 slug（06 §2.3）。
 * 选中 = 实底 primary（旧「实底渐变」已废弃）；多值 OR（点击切换 URL label 参数）。根行首「全部」= 清空。
 *
 * 换皮（plan T22）：
 * - `.glass`（毛玻璃 + 白描边 + `--shadow-card` 蓝投影）→ **白卡 `bg-card` + `shadow-sm`**；
 *   圆角 `--r-lg` 16 不成轴 → 就近向下 `rounded-xl`(14)；内距 `12px 16px` → `px-4 py-3`；
 *   下边距 14 → `mb-3.5`（与 `AssetGrid` gap 14px 同值）
 * - 字阶（⑤）：12.5 → `text-xs`（12/12.5 同桶）· 11 / 700 / `tracking .7px` 保档
 * - **子行 pill 与根行统一**：旧 `.sub` 仅差衬底透明度（`.5` vs `.65`）——白卡上不可辨且无 §4.4
 *   依据，故两行同用 `CHIP_OFF`（不再有 `styles.sub`；`cls` 的 `sub` 入参随之取消）
 * - 过渡 `color/border-color .12s` → `transition-colors`（0.15s，登记）
 * 不变：两级组树与 `labelName` 回退链 · 根行首「全部」= `onClearAll` · 多值 OR 切换（`onToggle`）·
 * `aria` 无（沿用原状）· 标签源空/未就 → 整条不渲染（优雅降级）。
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

  const cls = (on: boolean) => `${CHIP} ${on ? CHIP_ON : CHIP_OFF}`;

  return (
    <div className="mb-3.5 flex items-start gap-3 rounded-xl bg-card px-4 py-3 shadow-sm">
      <span className="shrink-0 pt-[7px] text-[11px] font-bold tracking-[0.7px] text-muted-foreground uppercase">
        {t('market', 'tagFilter')}
      </span>
      <div className="flex flex-1 flex-col gap-[7px]">
        <div className="flex flex-wrap items-center gap-[7px]">
          <button type="button" className={cls(selected.length === 0)} onClick={onClearAll}>
            {t('market', 'allLabel')}
          </button>
          {roots.map((label) => (
            <button
              key={label.slug}
              type="button"
              className={cls(selected.includes(label.slug))}
              onClick={() => onToggle(label.slug)}
            >
              {labelName(label)}
            </button>
          ))}
        </div>
        {children.length > 0 && (
          <div className="flex flex-wrap items-center gap-[7px]">
            {children.map((label) => (
              <button
                key={label.slug}
                type="button"
                className={cls(selected.includes(label.slug))}
                onClick={() => onToggle(label.slug)}
              >
                {labelName(label)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
