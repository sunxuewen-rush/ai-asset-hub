import { fetchLabels } from '../../api/labels.js';
import type { LabelDto } from '../../api/types.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import styles from './FilterStrip.module.css';

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
 * 选中 = 实底渐变（.ca）；多值 OR（点击切换 URL label 参数）。根行首「全部」= 清空。
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

  const cls = (slug: string, sub: boolean) =>
    `${styles.pill} ${sub ? styles.sub : ''} ${selected.includes(slug) ? styles.on : ''}`;

  return (
    <div className={`glass ${styles.strip}`}>
      <span className={styles.title}>{t('market', 'tagFilter')}</span>
      <div className={styles.cols}>
        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.pill} ${selected.length === 0 ? styles.on : ''}`}
            onClick={onClearAll}
          >
            {t('market', 'allLabel')}
          </button>
          {roots.map((label) => (
            <button
              key={label.slug}
              type="button"
              className={cls(label.slug, false)}
              onClick={() => onToggle(label.slug)}
            >
              {labelName(label)}
            </button>
          ))}
        </div>
        {children.length > 0 && (
          <div className={styles.row}>
            {children.map((label) => (
              <button
                key={label.slug}
                type="button"
                className={cls(label.slug, true)}
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
