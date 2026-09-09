import { useRef, useState } from 'react';
import { ApiError } from '../../../api/client.js';
import { fetchCompare } from '../../../api/compare.js';
import type { CompareResponse, VersionListItem } from '../../../api/types.js';
import { useApi } from '../../../hooks/useApi.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { Badge } from '../../ui/Badge.js';
import { Spinner } from '../../ui/Spinner.js';
import { formatDate } from '../format.js';
import { DiffNav } from './DiffNav.js';
import { DiffView } from './DiffView.js';
import { formatBytes } from './fileTreeNodes.js';
import styles from './VersionCompare.module.css';

interface Pair {
  base: number;
  head: number;
}

/** 防非法调换归一：base 必须旧于 head（降序下标 base > head）——不满足即交换 */
function normalizePair(base: number, head: number): Pair {
  return base > head ? { base, head } : { base: head, head: base };
}

/** 初始对：head = latest（或最新一行），base = 其前一个（更旧） */
function initialPair(listLength: number, latestIdx: number): Pair {
  if (listLength <= 1) return { base: 0, head: 0 };
  const head = latestIdx >= 0 ? latestIdx : 0;
  const base = head + 1 < listLength ? head + 1 : head - 1;
  return { base, head };
}

/**
 * 版本 tab（design §4.4 v0.7 / skillhub 形态）：历史列表 + 双下拉 base⇄head 行级对比。
 * 守卫：normalizePair 客户端先行防非法调换（选对非法自动交换；选同侧忽略）；任一 YANKED →
 * 禁请求 + 400 兜底文案（服务端同码 version_yanked）。diff：变更文件导航滚动锚点 +
 * 折叠 + +N−M + 行级三列（GitHub 亮色）。
 */
export function VersionCompare({
  nsSlug,
  slug,
  versions,
  latestVersion,
}: {
  nsSlug: string;
  slug: string;
  versions: readonly VersionListItem[];
  latestVersion: string | null;
}) {
  const { t } = useI18n();
  const list = [...versions]; // 降序（服务端默认——下标小 = 新）
  const latestIdx = latestVersion ? list.findIndex((v) => v.version === latestVersion) : -1;
  const [pair, setPair] = useState<Pair>(() => initialPair(list.length, latestIdx));
  const [activeFile, setActiveFile] = useState(0);

  const base = list[pair.base] ?? null;
  const head = list[pair.head] ?? null;
  const chooseBase = (idx: number) =>
    setPair((p) => (p.head === idx ? p : normalizePair(idx, p.head)));
  const chooseHead = (idx: number) =>
    setPair((p) => (p.base === idx ? p : normalizePair(p.base, idx)));

  const blockedByYanked = base?.status === 'YANKED' || head?.status === 'YANKED';
  const pairValid = base !== null && head !== null && pair.base > pair.head && !blockedByYanked;

  const { data, loading, error } = useApi<CompareResponse | null>(
    (signal) =>
      pairValid && base && head
        ? fetchCompare(nsSlug, slug, base.version, head.version, { signal })
        : Promise.resolve(null),
    [nsSlug, slug, pairValid, base?.version, head?.version],
  );
  const files = data?.files ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  function selectFile(index: number) {
    setActiveFile(index);
    scrollRef.current
      ?.querySelector(`#dsec-${index}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div>
      {list.length >= 2 ? (
        <>
          <div className={styles.sel}>
            <div className={styles.col}>
              <label htmlFor="cmp-base">{t('market', 'cmpBase')}</label>
              <select
                id="cmp-base"
                value={base?.version ?? ''}
                onChange={(event) => {
                  const idx = list.findIndex((v) => v.version === event.target.value);
                  if (idx >= 0) chooseBase(idx);
                }}
              >
                {list.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version}
                  </option>
                ))}
              </select>
            </div>
            <span className={styles.arrow} aria-hidden="true">
              ⇄
            </span>
            <div className={styles.col}>
              <label htmlFor="cmp-head">{t('market', 'cmpHead')}</label>
              <select
                id="cmp-head"
                value={head?.version ?? ''}
                onChange={(event) => {
                  const idx = list.findIndex((v) => v.version === event.target.value);
                  if (idx >= 0) chooseHead(idx);
                }}
              >
                {list.map((v) => (
                  <option key={v.version} value={v.version}>
                    v{v.version}
                    {v.version === latestVersion ? ' · latest' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {blockedByYanked && <p className={styles.note}>{t('errors', 'asset.version_yanked')}</p>}
          {pairValid && loading && (
            <div className={styles.stateBox}>
              <Spinner />
            </div>
          )}
          {pairValid && !loading && error && (
            <p className={styles.note}>
              {t('errors', 'unknown', { code: error instanceof ApiError ? error.code : 'network' })}
            </p>
          )}
          {pairValid && !loading && !error && data && (
            <>
              {files.length === 0 ? (
                <p className={styles.note}>{t('market', 'diffNoChanges')}</p>
              ) : (
                <div className={styles.workspace}>
                  <DiffNav files={files} active={activeFile} onSelect={selectFile} />
                  <div ref={scrollRef} className={styles.diffScroll}>
                    <DiffView files={files} />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p className={styles.note}>{t('common', 'empty')}</p>
      )}

      <div className={styles.history}>
        {list.map((v) => {
          const isLive = v.version === latestVersion;
          return (
            <div key={v.version} className={styles.row}>
              <span className={styles.ver}>v{v.version}</span>
              <Badge tone={isLive ? 'success' : 'neutral'} mono>
                {isLive
                  ? t('market', 'versionLive')
                  : v.status === 'YANKED'
                    ? t('market', 'versionYanked')
                    : t('market', 'versionPublished')}
              </Badge>
              <span className={styles.meta}>
                {formatDate(v.createdAt)} · {v.fileCount} {t('market', 'fileUnit')} ·{' '}
                {formatBytes(v.totalSize)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
