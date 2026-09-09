import { useState } from 'react';
import { fetchAssetList } from '../../api/assets.js';
import { fetchStats } from '../../api/stats.js';
import type { AssetType } from '../../api/types.js';
import { useApi } from '../../hooks/useApi.js';
import { useMarketQuery } from '../../hooks/useMarketQuery.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import { EmptyState } from '../ui/EmptyState.js';
import { ErrorState } from '../ui/ErrorState.js';
import { Pagination } from '../ui/Pagination.js';
import { Spinner } from '../ui/Spinner.js';
import { TypeIcon } from '../ui/TypeIcon.js';
import { AssetCard, AssetGrid } from './AssetCard.js';
import styles from './CenterPage.module.css';
import { FilterStrip } from './FilterStrip.js';

const PAGE_SIZE = 20;

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
  | 'countBadgeAgents'
  | 'totalSkills'
  | 'totalMcps'
  | 'totalAgents';

const META: Record<
  AssetType,
  { title: MarketKey; desc: MarketKey; ph: MarketKey; badge: MarketKey; total: MarketKey }
> = {
  skill: {
    title: 'centerTitleSkill',
    desc: 'centerDescSkill',
    ph: 'searchPlaceholderSkill',
    badge: 'countBadgeSkill',
    total: 'totalSkills',
  },
  mcp: {
    title: 'centerTitleMcps',
    desc: 'centerDescMcps',
    ph: 'searchPlaceholderMcps',
    badge: 'countBadgeMcps',
    total: 'totalMcps',
  },
  agent: {
    title: 'centerTitleAgents',
    desc: 'centerDescAgents',
    ph: 'searchPlaceholderAgents',
    badge: 'countBadgeAgents',
    total: 'totalAgents',
  },
};

/**
 * 中心页（design §3 v0.4 定稿：CenterHeader → 两级标签筛选条 → result-head → 4×5 网格 →
 * 分页；type 参数化——/skills|/mcps|/agents 同构）。列表请求以 URL 提交态驱动
 * （committedQ/labels/page——防抖只写 URL，请求随 URL 变发——design §7）。
 */
export function CenterPage({ type }: { type: AssetType }) {
  const { t } = useI18n();
  const { q, setQ, committedQ, labels, toggleLabel, clearLabels, page, setPage } = useMarketQuery();
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);
  const [retryTick, setRetryTick] = useState(0);

  const labelsKey = labels.join(',');
  const {
    data: list,
    error,
    loading,
  } = useApi(
    (signal) =>
      fetchAssetList(
        {
          type,
          q: committedQ || undefined,
          labels: labels.length > 0 ? labels : undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        },
        { signal },
      ),
    [type, committedQ, labelsKey, page, retryTick],
  );

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

      <FilterStrip selected={labels} onToggle={toggleLabel} onClearAll={clearLabels} />

      <div className={styles.resultHead}>
        <span className={styles.total}>{t('market', meta.total, { n: list?.total ?? 0 })}</span>
        <span className={styles.sort}>{t('market', 'sortRecent')}</span>
      </div>

      {loading && (
        <div className={styles.stateBox}>
          <Spinner />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={() => setRetryTick((tick) => tick + 1)} />}
      {!loading && !error && list && list.items.length === 0 && (
        <EmptyState message={t('market', 'noResult')} />
      )}
      {!loading && !error && list && list.items.length > 0 && (
        <>
          <AssetGrid>
            {list.items.map((item) => (
              <AssetCard key={item.id} item={item} />
            ))}
          </AssetGrid>
          <Pagination
            total={list.total}
            limit={PAGE_SIZE}
            offset={(page - 1) * PAGE_SIZE}
            onPageChange={(nextOffset) => setPage(Math.floor(nextOffset / PAGE_SIZE) + 1)}
          />
        </>
      )}
    </div>
  );
}
