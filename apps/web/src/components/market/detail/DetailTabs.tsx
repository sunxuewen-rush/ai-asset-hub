import { type ReactNode, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider.js';
import styles from './DetailTabs.module.css';

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
 * 详情 Tab 卡（design §4.4 v0.7：玻璃卡 + 无下划线 tab——激活 = 底部 2px 蓝青渐变线 .tab-btn.on）。
 * 面板内容（总览/文件/版本）由 T15-T17 注入；懒加载由消费方以缓存 + 条件渲染实现。
 */
export function DetailTabs({ renderPane }: { renderPane: (tab: DetailTab) => ReactNode }) {
  const { t } = useI18n();
  const [active, setActive] = useState<DetailTab>('overview');
  return (
    <div className={`glass ${styles.card}`}>
      <div className={styles.list} role="tablist">
        {TABS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={`${styles.btn} ${active === key ? styles.on : ''}`}
            onClick={() => setActive(key)}
          >
            {t('market', labelKey)}
          </button>
        ))}
      </div>
      <div className={styles.pane} role="tabpanel">
        {renderPane(active)}
      </div>
    </div>
  );
}
