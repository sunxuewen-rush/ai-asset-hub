import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StatsResponse } from '../../api/types.js';
import { useI18n } from '../../i18n/I18nProvider.js';
import styles from './Hero.module.css';

/**
 * 首页 hero（design §4.4 v0.8 polish：96px 渐变大字 + 主句/副标 + 700px 搜索 + 双 CTA +
 * 三项统计（R7 stats）——光斑 alpha≤0.1 衬底、入场 rise stagger ≤0.2s、tabular-nums。
 * 搜索提交 → /skills?q=…（demo 拍板默认落技能中心，URL q 携带）。
 */
export function Hero({ stats }: { stats: StatsResponse | null }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/skills?q=${encodeURIComponent(q)}` : '/skills');
  }

  return (
    <section className={`glass ${styles.hero}`}>
      <h1 className={styles.title}>
        <em>AI X Hub</em>
      </h1>
      <p className={styles.intro}>{t('market', 'heroIntro')}</p>
      <p className={styles.sub}>{t('market', 'heroSub')}</p>

      <form className={styles.search} onSubmit={onSubmit}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('market', 'searchPlaceholder')}
          aria-label={t('market', 'searchPlaceholder')}
        />
        <button type="submit" className={styles.go}>
          {t('market', 'searchBtn')}
        </button>
      </form>

      <div className={styles.cta}>
        <Link to="/skills" className={styles.primary}>
          {t('market', 'browseMarket')}
        </Link>
        <a className={styles.ghost} href="#explore-types">
          {t('market', 'learnTypes')}
        </a>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <b>{stats?.totalAssets.toLocaleString() ?? '—'}</b>
          <span>{t('market', 'statAssets')}</span>
        </div>
        <div className={styles.stat}>
          <b>{stats?.totalDownloads.toLocaleString() ?? '—'}</b>
          <span>{t('market', 'statDownloads')}</span>
        </div>
        <div className={styles.stat}>
          <b>3</b>
          <span>{t('market', 'statTypes')}</span>
        </div>
      </div>
    </section>
  );
}
