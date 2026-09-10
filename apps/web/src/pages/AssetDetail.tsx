import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchAssetDetail } from '../api/assets.js';
import type { AssetType } from '../api/types.js';
import { fetchVersionDetail, fetchVersionList } from '../api/versions.js';
import { type DetailTab, DetailTabs } from '../components/market/detail/DetailTabs.js';
import { FilesTab } from '../components/market/detail/FilesTab.js';
import { OverviewTab } from '../components/market/detail/OverviewTab.js';
import { VersionCompare } from '../components/market/detail/VersionCompare.js';
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

/**
 * 资产详情页（design §3 v0.7：面包屑 → 头部（名称 + 可见性 pill + 标签行）→
 * 宽版双栏（三 Tab 玻璃卡主列 + 320px 右栏粘性 下载/元信息））。
 * 坐标 = 全局唯一裸 slug（M4-pre R5）。
 * 数据编排 §5.3 两波：波 1 = 详情 ∥ 版本列表（并发）；波 2 = latest 版本详情（依赖波 1
 * latestVersion，天然串行——文件清单/统计）。YANKED latest → 下载禁用 + 友好提示。
 */
export function AssetDetail() {
  const { slug = '' } = useParams();
  const { t, tErr } = useI18n();
  const [retryTick, setRetryTick] = useState(0);
  // 🟡3 受控下载（fetch blob → 前端可反馈 429/瞬时错误；成功走 a.download 保存）
  const [dlBusy, setDlBusy] = useState(false);
  const [dlErrorCode, setDlErrorCode] = useState<string | null>(null);

  const detailState = useApi((signal) => fetchAssetDetail(slug, { signal }), [slug, retryTick]);
  const versionsState = useApi(
    (signal) => fetchVersionList(slug, { limit: 100 }, { signal }),
    [slug, retryTick],
  );

  const detail = detailState.data;
  const latestVersion = detail?.latestVersion ?? null;
  // 波 2：latest 版本详情（latestVersion 到位才发；无版本资产 resolve null——不产错误噪音）
  const latestState = useApi(
    (signal) =>
      latestVersion ? fetchVersionDetail(slug, latestVersion, { signal }) : Promise.resolve(null),
    // R2：retryTick 并入——波 2 独立失败时可随页面重试一并重发
    [slug, latestVersion, retryTick],
  );

  const loading = detailState.loading || versionsState.loading;
  // R2：波 2 错误并入全局错态（此前静默——文件/总览误显空清单无诊断线索）
  const error =
    detailState.error ?? versionsState.error ?? (latestVersion ? latestState.error : null) ?? null;

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
    ? `/api/assets/${encodeURIComponent(slug)}/versions/${encodeURIComponent(latestVersion)}/download`
    : null;
  const centerPath = CENTER_OF[detail.type];
  const labelTitle = t('market', CENTER_TITLE_KEY[detail.type]);

  /** 🟡3 受控下载：fetch blob 让 429/瞬时错误有前端反馈（成功走 a.download 保存） */
  async function handleDownload(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!downloadUrl || isYanked || dlBusy) return;
    setDlBusy(true);
    setDlErrorCode(null);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        let code = `http_${res.status}`;
        try {
          const body = (await res.json()) as { code?: string };
          if (typeof body.code === 'string') code = body.code;
        } catch {
          // 非 JSON 错误体——保留 http_ 前缀码
        }
        setDlErrorCode(code);
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${slug}-v${latestVersion}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      setDlErrorCode('network');
    } finally {
      setDlBusy(false);
    }
  }

  /** tab 面板注入（总览/文件 = 波 2 latest 消费；versions 待 T17） */
  const renderPane = (tab: DetailTab) => {
    if (tab === 'overview') {
      if (!latestVersion) return <p className={styles.paneNote}>—</p>;
      return (
        <OverviewTab
          type={detail.type}
          slug={slug}
          version={latestVersion}
          // R2：波 2 未就 → null（子组件显加载占位而非误导性空清单）
          files={latestState.data ? latestState.data.files : null}
          manifest={latestState.data?.manifestJson ?? null}
          changelog={latestState.data?.changelog}
        />
      );
    }
    if (tab === 'files') {
      if (!latestVersion) return <p className={styles.paneNote}>—</p>;
      return (
        <FilesTab
          slug={slug}
          version={latestVersion}
          files={latestState.data ? latestState.data.files : null}
        />
      );
    }
    // versions tab：波 1 版本列表数据源（历史 + 对比）
    return (
      <VersionCompare
        slug={slug}
        versions={versionsState.data?.items ?? []}
        latestVersion={detail.latestVersion}
      />
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link to="/">{t('market', 'crumbHome')}</Link> / <Link to={centerPath}>{labelTitle}</Link> /{' '}
        <b>{slug}</b>
      </div>

      <div className={`glass ${styles.head}`}>
        <div className={styles.topRow}>
          <h1>{detail.latestName ?? detail.slug}</h1>
          <Badge tone="success" mono>
            {detail.visibility}
          </Badge>
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
              <a
                className={`${styles.dlBtn} ${dlBusy ? styles.dlBusy : ''}`}
                href={downloadUrl}
                onClick={(event) => void handleDownload(event)}
                aria-busy={dlBusy}
              >
                {dlBusy
                  ? t('market', 'dlDownloading')
                  : `${t('market', 'dlLatest')} ${latestVersion}`}
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
            {dlErrorCode && (
              <p className={styles.dlErr} role="alert">
                {tErr(dlErrorCode)}
              </p>
            )}
          </div>

          <div className={`glass ${styles.panel}`}>
            <h3 className={styles.panelTitle}>{t('market', 'metaInfo')}</h3>
            <div className={styles.kv}>
              <span>{t('market', 'author')}</span>
              <b>{owner || '—'}</b>
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
