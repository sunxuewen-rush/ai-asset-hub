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
 *
 * 换皮（T20）：原 `VersionCompare.module.css` 全量 Tailwind 化——`--text-2/3`→`muted-foreground` ·
 * `--line-*`→`border` · `--brand-3`（青色 ⇄ 箭头，随渐变层废弃）→ `muted-foreground`；
 * 原生 select 用 **`--input`/`--ring` 焦点环**（§4.4 ③ input/select 真值，`ring-[3px] ring-ring/50`）；
 * 非轴值半径**就近向下**归位（12→`rounded-lg`(10) · 11→`rounded-lg`）。逻辑/守卫/滚动锚点零变更。
 */
export function VersionCompare({
  slug,
  versions,
  latestVersion,
}: {
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
        ? fetchCompare(slug, base.version, head.version, { signal })
        : Promise.resolve(null),
    [slug, pairValid, base?.version, head?.version],
  );
  const files = data?.files ?? [];

  const scrollRef = useRef<HTMLDivElement>(null);
  function selectFile(index: number) {
    setActiveFile(index);
    scrollRef.current
      ?.querySelector(`#dsec-${index}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** 下拉 label（旧 `.col label`：11px 大写 mono 味标签） */
  const labelCls =
    'mb-[5px] block text-[11px] font-bold tracking-[0.5px] text-muted-foreground uppercase';
  /** 下拉本体（旧 `.col select`：白底 + 泛蓝细边 + 焦点环，§4.4 ③） */
  const selectCls =
    'w-full rounded-md border border-input bg-card px-[9px] py-[7px] font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50';

  return (
    <div>
      {list.length >= 2 ? (
        <>
          <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2.5 rounded-lg border border-border bg-secondary/60 px-3.5 py-3">
            <div>
              <label className={labelCls} htmlFor="cmp-base">
                {t('market', 'cmpBase')}
              </label>
              <select
                id="cmp-base"
                className={selectCls}
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
            <span className="pb-[5px] text-base text-muted-foreground" aria-hidden="true">
              ⇄
            </span>
            <div>
              <label className={labelCls} htmlFor="cmp-head">
                {t('market', 'cmpHead')}
              </label>
              <select
                id="cmp-head"
                className={selectCls}
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

          {blockedByYanked && (
            <p className="px-1 py-2.5 text-center text-xs text-muted-foreground">
              {t('errors', 'asset.version_yanked')}
            </p>
          )}
          {pairValid && loading && (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          )}
          {pairValid && !loading && error && (
            <p className="px-1 py-2.5 text-center text-xs text-muted-foreground">
              {t('errors', 'unknown', { code: error instanceof ApiError ? error.code : 'network' })}
            </p>
          )}
          {pairValid && !loading && !error && data ? (
            files.length === 0 ? (
              <p className="px-1 py-2.5 text-center text-xs text-muted-foreground">
                {t('market', 'diffNoChanges')}
              </p>
            ) : (
              <div className="mt-1 mb-4 grid grid-cols-[230px_1fr] items-start gap-3.5">
                <DiffNav files={files} active={activeFile} onSelect={selectFile} />
                <div ref={scrollRef} className="min-w-0">
                  <DiffView files={files} />
                </div>
              </div>
            )
          ) : null}
        </>
      ) : (
        <p className="px-1 py-2.5 text-center text-xs text-muted-foreground">
          {t('common', 'empty')}
        </p>
      )}

      <div className="mt-4 border-t border-border pt-3">
        {list.map((v) => {
          const isLive = v.version === latestVersion;
          return (
            <div
              key={v.version}
              className="mb-1.5 flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-[11px]"
            >
              <span className="font-mono text-[13px] font-bold">v{v.version}</span>
              <Badge tone={isLive ? 'success' : 'neutral'} mono>
                {isLive
                  ? t('market', 'versionLive')
                  : v.status === 'YANKED'
                    ? t('market', 'versionYanked')
                    : t('market', 'versionPublished')}
              </Badge>
              <span className="ml-auto font-mono text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
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
