import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchAssetDetail } from '../api/assets.js';
import type { AssetType } from '../api/types.js';
import { fetchVersionDetail, fetchVersionList } from '../api/versions.js';
import { type DetailTab, DetailTabs } from '../components/market/detail/DetailTabs.js';
import { FilesTab } from '../components/market/detail/FilesTab.js';
import { OverviewTab } from '../components/market/detail/OverviewTab.js';
import { compactCount, formatDate, ownerText } from '../components/market/format.js';
import { Badge } from '../components/ui/Badge.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { Spinner } from '../components/ui/Spinner.js';
import { useApi } from '../hooks/useApi.js';
import { useI18n } from '../i18n/I18nProvider.js';
import styles from './AssetDetail.module.css';

const CENTER_OF: Record<AssetType, string> = { skill: '/skills', mcp: '/mcps', agent: '/agents' };
const CENTER_TITLE_KEY: Record<
  AssetType,
  'centerTitleSkill' | 'centerTitleMcps' | 'centerTitleAgents'
> = {
  skill: 'centerTitleSkill',
  mcp: 'centerTitleMcps',
  agent: 'centerTitleAgents',
};

/** versions tab 占位——T17 替换（防空白） */
function panePlaceholder(tab: DetailTab) {
  const notes: Record<DetailTab, string> = {
    overview: '',
    files: '',
    versions: '版本 tab：历史 + 行级对比（T17 落地）',
  };
  return <p className={styles.paneNote}>{notes[tab]}</p>;
}

/**
 * 资产详情页（design §3 v0.7：面包屑 → 头部（名称 + 可见性 pill + @ns + 标签行）→
 * 宽版双栏（三 Tab 玻璃卡主列 + 320px 右栏粘性 下载/元信息））。
 * 数据编排 §5.3 两波：波 1 = 详情 ∥ 版本列表（并发）；波 2 = latest 版本详情（依赖波 1
 * latestVersion，天然串行——文件清单/统计）。YANKED latest → 下载禁用 + 友好提示。
 */
export function AssetDetail() {
  const { nsSlug = '', slug = '' } = useParams();
  const { t } = useI18n();
  const [retryTick, setRetryTick] = useState(0);

  const detailState = useApi(
    (signal) => fetchAssetDetail(nsSlug, slug, { signal }),
    [nsSlug, slug, retryTick],
  );
  const versionsState = useApi(
    (signal) => fetchVersionList(nsSlug, slug, { limit: 100 }, { signal }),
    [nsSlug, slug, retryTick],
  );

  const detail = detailState.data;
  const latestVersion = detail?.latestVersion ?? null;
  // 波 2：latest 版本详情（latestVersion 到位才发；无版本资产 resolve null——不产错误噪音）
  const latestState = useApi(
    (signal) =>
      latestVersion
        ? fetchVersionDetail(nsSlug, slug, latestVersion, { signal })
        : Promise.resolve(null),
    [nsSlug, slug, latestVersion],
  );

  const loading = detailState.loading || versionsState.loading;
  const error = detailState.error ?? versionsState.error;

  if (error) {
    return <ErrorState error={error} onRetry={() => setRetryTick((n) => n + 1)} />;
  }
  if (loading || !detail) {
    return (
      <div className={styles.stateBox}>
        <Spinner />
      </div>
    );
  }

  const owner = ownerText(detail);
  const isYanked = latestState.data?.status === 'YANKED';
  const downloadUrl = latestVersion
    ? `/api/assets/${encodeURIComponent(nsSlug)}/${encodeURIComponent(slug)}/versions/${encodeURIComponent(latestVersion)}/download`
    : null;
  const centerPath = CENTER_OF[detail.type];
  const labelTitle = t('market', CENTER_TITLE_KEY[detail.type]);

  /** tab 面板注入（总览/文件 = 波 2 latest 消费；versions 待 T17） */
  const renderPane = (tab: DetailTab) => {
    if (tab === 'overview') {
      if (!latestVersion) return <p className={styles.paneNote}>—</p>;
      return (
        <OverviewTab
          type={detail.type}
          nsSlug={nsSlug}
          slug={slug}
          version={latestVersion}
          files={latestState.data?.files ?? []}
          manifest={latestState.data?.manifestJson ?? null}
          changelog={latestState.data?.changelog}
        />
      );
    }
    if (tab === 'files') {
      if (!latestVersion) return <p className={styles.paneNote}>—</p>;
      return (
        <FilesTab
          nsSlug={nsSlug}
          slug={slug}
          version={latestVersion}
          files={latestState.data?.files ?? []}
        />
      );
    }
    return panePlaceholder(tab);
  };

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link to="/">{t('market', 'crumbHome')}</Link> / <Link to={centerPath}>{labelTitle}</Link> /{' '}
        <b>
          @{nsSlug}/{slug}
        </b>
      </div>

      <div className={`glass ${styles.head}`}>
        <div className={styles.topRow}>
          <h1>{detail.latestName ?? detail.slug}</h1>
          <Badge tone="success" mono>
            {detail.visibility}
          </Badge>
          <span className={styles.nsPill}>@{detail.namespaceSlug}</span>
        </div>
        {detail.labels.length > 0 && (
          <div className={styles.tags}>
            {detail.labels.map((label) => (
              <span key={label.slug} className={styles.tag}>
                {label.displayName ?? label.slug}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.main}>
          <DetailTabs renderPane={renderPane} />
        </div>
        <aside className={styles.side}>
          <div className={`glass ${styles.panel} ${styles.dlCard}`}>
            {downloadUrl && !isYanked ? (
              <a className={styles.dlBtn} href={downloadUrl}>
                {t('market', 'dlLatest')} {latestVersion}
              </a>
            ) : (
              <span className={`${styles.dlBtn} ${styles.dlDisabled}`}>
                {t('market', 'dlLatest')} {latestVersion ?? ''}
              </span>
            )}
            <div className={styles.dlSub}>
              {isYanked ? (
                t('errors', 'asset.version_yanked')
              ) : (
                <>
                  {t('market', 'dlSubAnon')}
                  <br />
                  {t('market', 'dlSubRate')}
                </>
              )}
            </div>
          </div>

          <div className={`glass ${styles.panel}`}>
            <h3 className={styles.panelTitle}>{t('market', 'metaInfo')}</h3>
            <div className={styles.kv}>
              <span>{t('market', 'author')}</span>
              <b>{owner || '—'}</b>
            </div>
            <div className={styles.kv}>
              <span>{t('market', 'namespace')}</span>
              <b className={styles.mono}>@{detail.namespaceSlug}</b>
            </div>
            <div className={styles.kv}>
              <span>{t('market', 'visibility')}</span>
              <b>{detail.visibility}</b>
            </div>
            <div className={styles.kv}>
              <span>{t('market', 'updatedAt')}</span>
              <b>{formatDate(detail.updatedAt)}</b>
            </div>
            <div className={styles.kv}>
              <span>{t('market', 'downloads')}</span>
              <b>{compactCount(detail.downloadCount)}</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
