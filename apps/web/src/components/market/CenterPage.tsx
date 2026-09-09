import { fetchStats } from '../../api/stats.js';
import type { AssetType } from '../../api/types.js';
import { useApi } from '../../hooks/useApi.js';
import { useMarketQuery } from '../../hooks/useMarketQuery.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import { TypeIcon } from '../ui/TypeIcon.js';
import styles from './CenterPage.module.css';

type MarketKey =
  | 'centerTitleSkill'
  | 'centerTitleMcps'
  | 'centerTitleAgents'
  | 'centerDescSkill'
  | 'centerDescMcps'
  | 'centerDescAgents'
  | 'searchPlaceholderSkill'
  | 'searchPlaceholderMcps'
  | 'searchPlaceholderAgents'
  | 'countBadgeSkill'
  | 'countBadgeMcps'
  | 'countBadgeAgents';

const META: Record<
  AssetType,
  { title: MarketKey; desc: MarketKey; ph: MarketKey; badge: MarketKey }
> = {
  skill: {
    title: 'centerTitleSkill',
    desc: 'centerDescSkill',
    ph: 'searchPlaceholderSkill',
    badge: 'countBadgeSkill',
  },
  mcp: {
    title: 'centerTitleMcps',
    desc: 'centerDescMcps',
    ph: 'searchPlaceholderMcps',
    badge: 'countBadgeMcps',
  },
  agent: {
    title: 'centerTitleAgents',
    desc: 'centerDescAgents',
    ph: 'searchPlaceholderAgents',
    badge: 'countBadgeAgents',
  },
};

/**
 * 中心页（design §3 v0.4：type 参数化单组件——/skills|/mcps|/agents 同构）。
 * CenterHeader（图标 + 标题中英 + 副述 + 类型内搜索（左） + 计数徽章（右，R7 stats））——
 * 筛选条/网格/分页由 T13 续接。
 */
export function CenterPage({ type }: { type: AssetType }) {
  const { t } = useI18n();
  const { q, setQ } = useMarketQuery();
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);
  const meta = META[type];
  const count = stats?.typeCounts[type];

  return (
    <div className={styles.page}>
      <div className={`glass ${styles.head} ${styles[type]}`}>
        <span className={styles.icon}>
          <TypeIcon type={type} size={23} />
        </span>
        <div className={styles.titles}>
          <h1>{t('market', meta.title)}</h1>
          <span className={styles.en}>{t('market', meta.title)}</span>
          <p>{t('market', meta.desc)}</p>
        </div>
        <div className={styles.search}>
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={t('market', meta.ph)}
            aria-label={t('market', meta.ph)}
          />
        </div>
        <div className={styles.badge}>
          <b>{count === undefined ? '—' : count.toLocaleString()}</b>
          <span>{t('market', meta.badge)}</span>
        </div>
      </div>
      {/* T13：FilterStrip + 资产卡网格 + Pagination */}
    </div>
  );
}
