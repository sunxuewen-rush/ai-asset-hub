import type { ReactNode } from 'react';
import { useState } from 'react';
import { ApiError } from '../../../api/client.js';
import { fetchCompare } from '../../../api/compare.js';
import type { CompareResponse, VersionListItem, VersionStatus } from '../../../api/types.js';
import { useApi } from '../../../hooks/useApi.js';
import { useI18n } from '../../../i18n/I18nProvider.js';
import { StatusPill } from '../../console/StatusPill.js';
import { DiffWorkspace } from '../../ui/DiffWorkspace.js';
import { formatBytes } from '../../ui/fileTreeNodes.js';
import { Spinner } from '../../ui/shadcn/spinner.js';
import { formatDate } from '../format.js';

/**
 * 版本八态 → i18n 键（`08 §7` 状态机；键随 M4b-4 T9 落，本批 T12 消费 —— 用户 2026-09-18 拍板）。
 *
 * 修正的**既有缺陷**（非本批引入）：M4a 的行徽章是**3 态映射**（live / YANKED / 其余一律「已发布」）
 * ⇒ `DRAFT`/`PENDING_REVIEW`/`REJECTED` 等非 latest 行显示错误文案。改用 `StatusPill kind="version"`
 * （`VERSION_STATUS_VARIANT` = M4b-1 已落映射）后逐态准确。
 */
const VERSION_STATUS_KEY = {
  DRAFT: 'version.status.draft',
  SCANNING: 'version.status.scanning',
  SCAN_FAILED: 'version.status.scan_failed',
  UPLOADED: 'version.status.uploaded',
  PENDING_REVIEW: 'version.status.pending_review',
  PUBLISHED: 'version.status.published',
  REJECTED: 'version.status.rejected',
  YANKED: 'version.status.yanked',
} as const satisfies Record<VersionStatus, string>;

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
 *
 * **M4b-4 T12 加性**：新增可选 `rowActions` 槽 —— 版本行**右侧动作位**（资产详情页管理区用它挂
 * 「删除版本 / 撤回分发」）。**不传 ⇒ 不渲染任何额外节点**（门户与其后各消费点零回归）；
 * 行内容（版本号 / 徽章 / 时间 · 文件数 · 体积）**沿用 M4a 既有渲染**（批 design §4.6 v1.9 F35：
 * 本批只增行内动作，不改行内容）。
 */
export function VersionCompare({
  slug,
  versions,
  latestVersion,
  rowActions,
}: {
  slug: string;
  versions: readonly VersionListItem[];
  latestVersion: string | null;
  /** 版本行动作槽（可选 · 加性）；给定 ⇒ 每行右侧渲染该节点 */
  rowActions?: (version: VersionListItem) => ReactNode;
}) {
  const { t } = useI18n();
  const list = [...versions]; // 降序（服务端默认——下标小 = 新）
  const latestIdx = latestVersion ? list.findIndex((v) => v.version === latestVersion) : -1;
  const [pair, setPair] = useState<Pair>(() => initialPair(list.length, latestIdx));

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
              /* M4b-5 F156：自绘 diff（`DiffNav` 侧导航 + `DiffView` 渲染）⇒ 官方件薄封装
                 （按文件折叠懒渲染 + 默认左右对比 + 高亮可开关 · design §4.10） */
              <div className="mt-1 mb-4 min-w-0">
                <DiffWorkspace files={files} />
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
              {/* 八态徽章（T12 修正：3 态映射 → 逐态准确）；「latest」标记仅在 latest 且已发布时叠加 */}
              <StatusPill
                kind="version"
                status={v.status}
                mono
                label={
                  isLive && v.status === 'PUBLISHED'
                    ? t('market', 'versionLive')
                    : t('assets', VERSION_STATUS_KEY[v.status])
                }
              />
              <span className="ml-auto font-mono text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
                {formatDate(v.createdAt)} · {v.fileCount} {t('market', 'fileUnit')} ·{' '}
                {formatBytes(v.totalSize)}
              </span>
              {rowActions ? (
                <span className="flex shrink-0 items-center gap-1.5">{rowActions(v)}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
