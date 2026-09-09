import { Link } from 'react-router-dom';
import { fetchAssetList } from '../api/assets.js';
import { fetchStats } from '../api/stats.js';
import type { AssetItem } from '../api/types.js';
import { Hero } from '../components/market/Hero.js';
import { TypeEntryCard } from '../components/market/TypeEntryCard.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.js';
import styles from './Home.module.css';

/** 千分位/紧凑计数（demo 元数据 ⇣1.3K 形态——≥1000 → X.X K 去尾零） */
function compactCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  const text = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '');
  return `${text}K`;
}

/** 作者展示（§5.2 G6：工号形态 userId（非 usr_ 前缀）→「displayName · userId」；本地账号只显姓名） */
function ownerText(item: AssetItem): string {
  const { ownerDisplayName, ownerId } = item;
  if (!ownerDisplayName) return ownerId.startsWith('usr_') ? '' : ownerId;
  return ownerId.startsWith('usr_') ? ownerDisplayName : `${ownerDisplayName} · ${ownerId}`;
}

const TYPE_DOT: Record<AssetItem['type'], string> = {
  skill: 'var(--brand)',
  mcp: '#0891b2',
  agent: '#7c3aed',
};

/** 首页（design §3/§4.4 v0.8：hero + 按类型探索（真实计数 R7）+ 最新发布（R5/R6 字段行式）） */
export function Home() {
  const { t } = useI18n();
  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);
  const { data: latest } = useApi((signal) => fetchAssetList({ limit: 3 }, { signal }), []);

  return (
    <div className={styles.home}>
      <Hero stats={stats ?? null} />

      <section className={styles.sec} id="explore-types">
        <h2 className={styles.secHead}>{t('market', 'exploreByType')}</h2>
        <TypeEntryCard stats={stats ?? null} />
      </section>

      <section className={styles.sec}>
        <div className={styles.secRow}>
          <h2 className={styles.secHead}>{t('market', 'latestTitle')}</h2>
          <Link to="/skills" className={styles.more}>
            {t('market', 'latestAll')} →
          </Link>
        </div>
        <div className={`glass ${styles.latest}`}>
          {(latest?.items ?? []).map((item) => (
            <Link
              key={item.id}
              to={`/assets/${encodeURIComponent(item.namespaceSlug)}/${encodeURIComponent(item.slug)}`}
              className={styles.lrow}
            >
              <span className={styles.dot} style={{ background: TYPE_DOT[item.type] }} />
              <span className={styles.tt}>
                <b>{item.latestName ?? item.slug}</b>
                <span className={styles.coord}>
                  @{item.namespaceSlug}/{item.slug}
                  {item.latestVersion ? ` · v${item.latestVersion}` : ''}
                </span>
              </span>
              <span className={styles.meta}>
                <span className={styles.dl}>⇣ {compactCount(item.downloadCount)}</span>
                {ownerText(item) && <span>{ownerText(item)}</span>}
              </span>
            </Link>
          ))}
          {latest && latest.items.length === 0 && (
            <div className={styles.empty}>{t('common', 'empty')}</div>
          )}
        </div>
      </section>
    </div>
  );
}
