import { LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Label } from '@/components/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/shadcn/toggle-group';
import { fetchAssetList } from '../api/assets.js';
import type { AssetItem, AssetType } from '../api/types.js';
import { AssetCard, AssetGrid } from '../components/market/AssetCard.js';
import { AssetList } from '../components/market/AssetList.js';
import {
  isSortKey,
  PAGE_SIZE,
  SORT_LABEL_KEYS,
  SORT_OPTIONS,
} from '../components/market/sortOptions.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { ErrorState } from '../components/ui/ErrorState.js';
import { Pagination } from '../components/ui/Pagination.js';
import { useApi } from '../hooks/useApi.js';
import type { SortDir } from '../hooks/useMarketQuery.js';
import { useMarketQuery } from '../hooks/useMarketQuery.js';
import { useI18n } from '../i18n/I18nProvider.js';

/**
 * **全资产搜索结果页**（T11-i A 部分 · 规格 = M4a design **§8.12**）
 *
 * 入口 = 首页 Hero 与顶栏的公共搜索件（`AssetSearch`）提交 `/search?q=` ⇒ **跨类型**结果。
 * 与门户三页的分工（用户 2026-09-20 口径）：**顶栏/首页 = 全资产快速通道**·**`/skills` 等资产页 = 只搜本类型**。
 *
 * · URL 参数：`?q=`（关键词）· `?type=`（`all`(默认) / `skill` / `mcp` / `agent`）· `?sort=&dir=`（**复用
 *   `sortOptions` 三档白名单**）· `?page=`（`useMarketQuery` 统一防抖 / 回页 / URL 同步）
 * · **零后端改动**：`type` 本就可选（`api/assets.ts:13`）⇒ 不传即全类型
 * · **页内不放第二个搜索框**（与顶栏重复 —— T11-e 已因「重复入口」删过页头搜索）；改词直接用顶栏框
 * · 类型 chips / 排序 / 视图切换 = 官方 `ToggleGroup` / `Select`（沿门户同款配方）· 列表 / 网格 / 分页复用现有件
 * · `q` 为空 ⇒ 引导文案（不渲染列表）；无结果 ⇒ 现有 `EmptyState`
 */
type ViewMode = 'grid' | 'list';

/** 类型 chips 四档（`all` 为 URL 缺省值 —— 干净 URL） */
const TYPE_TABS = ['all', 'skill', 'mcp', 'agent'] as const;
type TypeTab = (typeof TYPE_TABS)[number];
const TYPE_LABEL_KEYS = {
  all: 'typeAll',
  skill: 'typeSkill',
  mcp: 'typeMcp',
  agent: 'typeAgent',
} as const;

/** 载态骨架槽位（沿门户：8 壳 = 1440 断点首屏可见量） */
const LOADING_SLOTS = ['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6', 'sk7', 'sk8'];
/** 载态时传给 `AssetList` 的空数据（模块级常量 · 同门户） */
const NO_ITEMS: readonly AssetItem[] = [];

/** URL 值归一（非法 / 缺省 ⇒ `all`；与服务端「静默回落」同口径） */
function isTypeTab(value: string | null): value is TypeTab {
  return value !== null && (TYPE_TABS as readonly string[]).includes(value);
}

export function Search() {
  const { t } = useI18n();
  const query = useMarketQuery({ sort: { defaultValue: 'newest' } });
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('grid');
  const [retryTick, setRetryTick] = useState(0);

  const rawType = params.get('type');
  const tab: TypeTab = isTypeTab(rawType) ? rawType : 'all';
  /** `all` ⇒ 不传 `type`（服务端「不带 = 全类型」） */
  const type: AssetType | undefined = tab === 'all' ? undefined : tab;
  const sort = isSortKey(query.sort) ? query.sort : 'newest';
  const dir = query.dir;
  const q = query.committedQ;
  const page = query.page;

  /** 换类型档（URL 写 / 删 `type` + 回第 1 页 —— 与门户筛选口径一致） */
  function setTab(next: TypeTab) {
    const p = new URLSearchParams(params);
    if (next === 'all') p.delete('type');
    else p.set('type', next);
    p.delete('page');
    setParams(p, { replace: true });
  }

  const {
    data: list,
    error,
    loading,
  } = useApi(
    (signal) =>
      q
        ? fetchAssetList(
            { type, q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, sort, dir },
            { signal },
          )
        : // 无关键词 ⇒ 不发请求（页面渲染引导文案）
          Promise.resolve({ items: [], total: 0, limit: PAGE_SIZE, offset: 0 }),
    [type, q, page, sort, dir, retryTick],
  );

  /**
   * 列头可点排序（沿门户：**档位由列 `meta.sortKey` 携带**，本处只落 URL）。
   * 同列 ⇒ 反向（`setDir`）；异列 ⇒ `setSort(档, 'desc')`。白名单外加一道 `isSortKey` 兜底。
   */
  function handleHeaderSort(key: string, nextDir: SortDir) {
    if (!isSortKey(key)) return;
    if (key === sort) query.setDir?.(nextDir);
    else query.setSort?.(key, nextDir);
  }

  /** 翻页 → 滚动复位（沿门户「翻页回顶」语义） */
  function handlePageChange(nextOffset: number) {
    query.setPage(Math.floor(nextOffset / PAGE_SIZE) + 1);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-bold tracking-[-0.4px]">{t('market', 'searchAllTitle')}</h1>
        {q ? (
          <span className="text-[13px] text-muted-foreground">
            {`「${q}」· `}
            {t('market', 'searchAllCount', { n: list?.total ?? 0 })}
          </span>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 px-0.5">
        {/* 类型 chips（T11-i）：官方 `ToggleGroup`（`type="single"` —— 再点当前项会回调空串 ⇒ 守卫） */}
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={tab}
          onValueChange={(next) => {
            if (next) setTab(next as TypeTab);
          }}
        >
          {TYPE_TABS.map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              aria-label={t('market', TYPE_LABEL_KEYS[item])}
            >
              {t('market', TYPE_LABEL_KEYS[item])}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* 排序（沿门户配方：官方 `Select` `size="sm"` 32px · 宽 160px · `Label` + `id`） */}
        <Select value={sort} onValueChange={(next) => query.setSort?.(next)}>
          <Label htmlFor="search-sort" className="ml-auto text-muted-foreground">
            {t('market', 'sortLabel')}
          </Label>
          <SelectTrigger id="search-sort" size="sm" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t('market', SORT_LABEL_KEYS[option])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 视图切换（沿门户：官方 `ToggleGroup`，`type="single"` 下点当前项回调空串 ⇒ 以 `if (next)` 守住两态必居其一） */}
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={view}
          onValueChange={(next) => {
            if (next) setView(next as ViewMode);
          }}
        >
          <ToggleGroupItem
            value="grid"
            aria-label={t('market', 'viewGrid')}
            title={t('market', 'viewGrid')}
          >
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label={t('market', 'viewList')}
            title={t('market', 'viewList')}
          >
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {q === '' && <EmptyState message={t('market', 'searchAllHint')} />}
      {q !== '' &&
        loading &&
        (view === 'grid' ? (
          <AssetGrid>
            {LOADING_SLOTS.map((slot) => (
              <Skeleton key={slot} className="h-[166px] rounded-xl" />
            ))}
          </AssetGrid>
        ) : (
          <AssetList
            items={NO_ITEMS}
            loading
            sorting={{ key: sort, dir, onChange: handleHeaderSort }}
          />
        ))}
      {q !== '' && error && (
        <ErrorState error={error} onRetry={() => setRetryTick((tick) => tick + 1)} />
      )}
      {q !== '' && !loading && !error && list && list.items.length === 0 && (
        <EmptyState message={t('market', 'noResult')} />
      )}
      {q !== '' && !loading && !error && list && list.items.length > 0 && (
        <>
          {view === 'grid' ? (
            <AssetGrid>
              {list.items.map((item) => (
                <AssetCard key={item.id} item={item} />
              ))}
            </AssetGrid>
          ) : (
            <AssetList
              items={list.items}
              sorting={{ key: sort, dir, onChange: handleHeaderSort }}
            />
          )}
          {/* 分页：与门户同口径 —— 仅多页时渲染（`total > PAGE_SIZE`） */}
          {list.total > PAGE_SIZE ? (
            <Pagination
              total={list.total}
              limit={PAGE_SIZE}
              offset={(page - 1) * PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
