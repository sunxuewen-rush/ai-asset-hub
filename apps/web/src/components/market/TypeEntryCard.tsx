import { Link } from 'react-router-dom';
import type { AssetType, StatsResponse } from '../../api/types.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import { TypeIcon } from '../ui/TypeIcon.js';
import styles from './TypeEntryCard.module.css';

interface TypeEntryMeta {
  type: AssetType;
  to: string;
  titleKey: 'centerTitleSkill' | 'centerTitleMcps' | 'centerTitleAgents';
  enKey: 'typeEnSkill' | 'typeEnMcps' | 'typeEnAgents';
  descKey: 'centerDescSkill' | 'centerDescMcps' | 'centerDescAgents';
}

const ENTRIES: readonly TypeEntryMeta[] = [
  {
    type: 'skill',
    to: '/skills',
    titleKey: 'centerTitleSkill',
    enKey: 'typeEnSkill',
    descKey: 'centerDescSkill',
  },
  {
    type: 'mcp',
    to: '/mcps',
    titleKey: 'centerTitleMcps',
    enKey: 'typeEnMcps',
    descKey: 'centerDescMcps',
  },
  {
    type: 'agent',
    to: '/agents',
    titleKey: 'centerTitleAgents',
    enKey: 'typeEnAgents',
    descKey: 'centerDescAgents',
  },
];

/**
 * 类型入口卡（design §4.4 v0.8：icon 左置 44px 横向 grid + 真实计数（R7 typeCounts）+
 * hover 箭头浮现；hover lift -3px——polish 数值；count 缺失按 0 渲染不破版）
 */
export function TypeEntryCard({ stats }: { stats: StatsResponse | null }) {
  const { t } = useI18n();
  return (
    <div className={styles.grid}>
      {ENTRIES.map(({ type, to, titleKey, enKey, descKey }) => {
        const count = stats?.typeCounts[type] ?? 0;
        return (
          <Link key={type} to={to} className={`glass ${styles.card}`}>
            <span className={`${styles.icon} ${styles[type]}`}>
              <TypeIcon type={type} size={21} />
            </span>
            <span className={styles.body}>
              <span className={styles.top}>
                <span className={styles.titles}>
                  {t('market', titleKey)}
                  <em className={styles.en}>{t('market', enKey)}</em>
                </span>
                <span className={styles.num}>
                  {count.toLocaleString()}
                  <small>{t('market', 'typeEntryUnit')}</small>
                </span>
              </span>
              <span className={styles.desc}>{t('market', descKey)}</span>
            </span>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </Link>
        );
      })}
    </div>
  );
}
