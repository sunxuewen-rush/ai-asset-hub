import { useState } from 'react';
import { Input } from '@/components/ui/shadcn/input';
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
 * 类型 icon tile 底色（§4.4 ② 类型色补丁 `--type-*` → `@theme` 映射；**查表替代旧
 * `styles[type]` 动态类名**——Tailwind 静态扫描不到拼接类，动态取值一律走查表）。
 */
const TILE_BG: Record<AssetType, string> = {
  skill: 'bg-type-skill',
  mcp: 'bg-type-mcp',
  agent: 'bg-type-agent',
};

/**
 * 中心页（design §3 v0.4 定稿：CenterHeader → 两级标签筛选条 → result-head → 4×5 网格 →
 * 分页；type 参数化——/skills|/mcps|/agents 同构）。列表请求以 URL 提交态驱动
 * （committedQ/labels/page——防抖只写 URL，请求随 URL 变发——design §7）。
 *
 * 换皮（plan T21，§4.4 SSOT）：
 * - 页头 `.glass`（毛玻璃 + 白色描边 + 蓝投影）→ **白卡 `bg-card` + `shadow-sm` + 圆角 18**
 *   （与 hero 同语法）；氛围光斑 `::before`（300px radial-gradient）整块删除（§4.4 废弃项）；
 *   `overflow-hidden`/`position:relative` 随光斑一并去除
 * - icon tile 52px 渐变（`--grad-skill/mcp/agent`）+ 蓝投影 → **44px 实底类型色 + 圆角 13px**
 *   + 白图标 22px（§4.4 ③ 类型 tile 真值；渐变只回品牌字/主 CTA/页面底三处）
 * - 页头搜索框改 shadcn `Input`（§4.1 纪律 1「交互件装原生」；与 hero 同件）——宽度、占位符、
 *   `aria-label`、受控行为不变
 * - 计数徽章（`--brand` #2563eb + rgba 衬底/描边 + r14）→ **hero 统计 tile 语法**（`bg-secondary`
 *   + `border-border` + `rounded-xl`），数字 `text-[22px] text-primary tabular-nums`
 * - 字阶收敛（§4.4 ⑤）：21 → `text-xl`(20，21 降 1px 归位) · 12.5 → `text-xs` · 13/11 保档
 * - 圆角轴（§4.4 ④）：18 → `rounded-2xl` · 14 → `rounded-xl` · 13 不成轴保 `rounded-[13px]`
 * 不变：请求编排（useApi / committedQ / labelsKey / retryTick）· `META` 动态 i18n 键 ·
 * 计数语义区分（徽章 = 全站总量，结果头在筛选激活时改「筛选结果」）· 三态（loading/error/empty）·
 * `PAGE_SIZE` 20 与分页 offset 换算 · `AssetGrid` 断点（4 → <1200 3 → <900 2）。
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
  // 🟡2 计数语义区分：徽章 = 该类型全站总量（stats）；结果头在筛选激活时改用「筛选结果」文案
  const filtersActive = labels.length > 0 || committedQ !== '';

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center gap-5 rounded-2xl bg-card px-[26px] py-[22px] shadow-sm">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-[13px] text-white ${TILE_BG[type]}`}
        >
          <TypeIcon type={type} size={22} />
        </span>
        <div className="relative min-w-0">
          <h1 className="text-xl font-bold tracking-[-0.4px]">{t('market', meta.title)}</h1>
          <span className="text-[11px] font-semibold tracking-[1px] text-muted-foreground uppercase">
            {t('market', meta.title)}
          </span>
          <p className="mt-1 text-[13px] text-muted-foreground">{t('market', meta.desc)}</p>
        </div>
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t('market', meta.ph)}
          aria-label={t('market', meta.ph)}
          className="ml-auto w-[240px]"
        />
        <div className="shrink-0 rounded-xl border border-border bg-secondary px-5 py-2.5 text-center">
          <b className="block text-[22px] leading-tight font-bold text-primary tabular-nums">
            {count === undefined ? '—' : count.toLocaleString()}
          </b>
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            {t('market', meta.badge)}
          </span>
        </div>
      </div>

      <FilterStrip selected={labels} onToggle={toggleLabel} onClearAll={clearLabels} />

      <div className="mb-3 flex items-center gap-3 px-0.5">
        <span className="text-[13px] text-muted-foreground">
          {filtersActive
            ? t('market', 'filteredCount', { n: list?.total ?? 0 })
            : t('market', meta.total, { n: list?.total ?? 0 })}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{t('market', 'sortRecent')}</span>
      </div>

      {loading && (
        <div className="flex justify-center py-14">
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
