import { Eye, Gauge, LayoutGrid, List as ListIcon, Search, X } from 'lucide-react';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { type AssetListParams, fetchAssetList } from '@/api/assets';
import { fetchStats } from '@/api/stats';
import type { AssetItem } from '@/api/types';
import { AssetStat } from '@/components/console/asset-stats';
import { Drawer } from '@/components/console/Drawer';
import { StatusPill } from '@/components/console/StatusPill';
import { AssetCard, AssetGrid } from '@/components/market/AssetCard';
import { FilterStrip } from '@/components/market/FilterStrip';
import { formatDate, ownerText } from '@/components/market/format';
import { SortMenu } from '@/components/market/SortMenu';
import { isSortKey, PAGE_SIZE, type SortKey } from '@/components/market/sortOptions';
import { AssetAvatar } from '@/components/ui/AssetAvatar';
import { type ColumnToggleItem, ColumnVisibilityMenu } from '@/components/ui/ColumnVisibilityMenu';
import { type ColumnUiMeta, DataTable, type TableSortingProps } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardHeader } from '@/components/ui/shadcn/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/shadcn/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/shadcn/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { Separator } from '@/components/ui/shadcn/separator';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/shadcn/toggle-group';
import { useApi } from '@/hooks/useApi';
import { useMarketQuery } from '@/hooks/useMarketQuery';
import { type Translate, useI18n } from '@/i18n/I18nProvider';

/**
 * M4b-6 资产管理页 · **UI 定案稿（DEV-only 原型，不进仓）**
 *
 * 立场（用户 2026-09-23 拍板）：**③ 详情抽屉 + ② 紧凑密度**（`density="default"` = 控制台操作态）；
 * 「最新版本」列保留；抽屉**只读**（管理动作仍集中在资产详情页管理区，零口径漂移）；
 * 状态徽标只对异常态醒目（`ACTIVE` 走轻字，不再 20 行重复浅徽标）；分页 URL 用 `?page=`（对齐门户）。
 *
 * 对齐依据（真读源码 · 与技能中心 / MCP 中心**同构**）：
 *   `market/CenterPage.tsx`（页头卡 + 工具条 + 折叠搜索 + 分页）· `market/AssetList.tsx`（列表 preset：
 *   `AssetAvatar` + `AssetStat` + `formatDate` + `table-fixed` + `meta` 列规格 + `Eye` 真链接）·
 *   `ui/{Pagination,EmptyState,ErrorState,ColumnVisibilityMenu}` · `market/{FilterStrip,SortMenu}` ·
 *   `console/Drawer`（**官方 `Sheet` 的仓内薄封装**：主 design §6.3 已定「宽 560 + 必带 Title」⇒
 *   复用既有封装，**不新造抽屉件、不引新依赖**）。
 *
 * 管理页特有差异（2 项）：① 「类型」筛选是 Select（门户按类型分路由，无此筛选）
 * ② 列集加「类型」「状态」两列治理维度（门户按类型分页且只读 ACTIVE）。
 *
 * 数据：真库（`GET /api/assets` + `GET /api/stats`，均匿名公开面）。`status` / `owner` 为本批新增服务端
 * 参数（尚未实现）⇒ 原型内不参与请求。
 */

const ALL = '__all__';
/** 类型文案（三族显式映射 —— `Translate` 键为字面量联合类型，不接模板键） */
function typeLabel(t: Translate, type: string): string {
  switch (type) {
    case 'skill':
      return t('assets', 'type.skill');
    case 'mcp':
      return t('assets', 'type.mcp');
    case 'agent':
      return t('assets', 'type.agent');
    default:
      return type;
  }
}

/** 状态文案（`assets.filter.status.*` —— 与筛选条同源，防两处措辞漂移） */
function statusLabel(t: Translate, status: string): string {
  switch (status) {
    case 'ACTIVE':
      return t('assets', 'filter.status.active');
    case 'HIDDEN':
      return t('assets', 'filter.status.hidden');
    case 'ARCHIVED':
      return t('assets', 'filter.status.archived');
    default:
      return status;
  }
}

/** 状态呈现（拍板：ACTIVE 轻字、异常态才用徽标 ⇒ 高信噪比） */
function StatusCell({ status }: { status: string }) {
  const { t } = useI18n();
  if (status === 'ACTIVE')
    return <span className="text-muted-foreground">{t('assets', 'filter.status.active')}</span>;
  if (status === 'HIDDEN')
    return <Badge variant="secondary">{t('assets', 'filter.status.hidden')}</Badge>;
  if (status === 'ARCHIVED')
    return <Badge variant="destructive">{t('assets', 'filter.status.archived')}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

/**
 * 列宽 = **权重 + 运行期归一化**（拍板：隐藏列后其余列**等比例摊开**，而不是让「操作」槽独吞）。
 *
 * 两个坑一起绕：① `table-fixed` 下百分比相对**表宽**是固定值 ⇒ 隐藏列后余量会全给「没有宽度类」的那列
 * （实测：「操作」87 → 335px，其余列纹丝不动）；② 宽度必须在运行期算，但不能拼 Tailwind 类名（JIT 扫不到
 * 运行期字符串）⇒ 用 **CSS 变量 + 字面量任意值类** `w-[var(--cw-*)]`（字面量可见 ⇒ 会生成）+ 祖先元素
 * inline 设变量。
 *
 * 口径：可见数据列按权重摊满 **92%**，余 **8% 归操作槽**（该列无宽度类 ⇒ 自动吸收，实测 ≈87px）。
 * 隐藏任意列 ⇒ 可见列等比例变宽（例：隐藏「描述」(23) 后 名称 16/92 → 16/69 × 92 ≈ **21.3%**）。
 */
const COL_WEIGHTS: Record<string, number> = {
  slug: 16,
  desc: 22,
  type: 8,
  status: 7,
  author: 10,
  version: 7,
  downloadCount: 7,
  starCount: 7,
  updatedAt: 8,
};
const DATA_W_TOTAL = 92;

/** 可见列的 CSS 变量表（`--cw-<columnKey>` ⇒ 百分比字符串） */
function useColumnVars(columnVisibility: Record<string, boolean>) {
  return useMemo(() => {
    const visible = Object.entries(COL_WEIGHTS).filter(([key]) => columnVisibility[key] !== false);
    const sum = visible.reduce((acc, [, weight]) => acc + weight, 0);
    const scale = DATA_W_TOTAL / sum;
    const vars: Record<string, string> = {};
    for (const [key, weight] of visible) vars[`--cw-${key}`] = `${(weight * scale).toFixed(3)}%`;
    return vars;
  }, [columnVisibility]);
}

function useColumns() {
  const { t } = useI18n();
  return useMemo(
    () => [
      {
        accessorKey: 'slug',
        header: t('assets', 'col.name'),
        meta: { headClassName: 'w-[var(--cw-slug)]', hidable: false } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          <div className="flex items-center gap-2">
            <AssetAvatar name={row.original.latestName ?? row.original.slug} size={24} />
            <span className="block min-w-0 truncate font-medium">
              {row.original.latestName ?? row.original.slug}
            </span>
          </div>
        ),
      },
      {
        id: 'desc',
        header: t('market', 'colDesc'),
        meta: {
          headClassName: 'w-[var(--cw-desc)]',
          cellClassName: 'whitespace-normal text-muted-foreground',
          hidable: true,
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          /* 空值显「—」（与抽屉同口径）；`title` = 原生全文 tooltip（零成本，补 `line-clamp-2` 的信息损失） */
          <div className="line-clamp-2 min-w-0" title={row.original.latestDescription ?? ''}>
            {row.original.latestDescription ?? '—'}
          </div>
        ),
      },
      {
        id: 'type',
        header: t('assets', 'col.type'),
        meta: { headClassName: 'w-[var(--cw-type)]', hidable: true } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          <Badge variant="secondary" className="max-w-full truncate">
            {typeLabel(t, row.original.type)}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: t('assets', 'col.status'),
        meta: { headClassName: 'w-[var(--cw-status)]', hidable: true } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          <StatusCell status={row.original.status} />
        ),
      },
      {
        id: 'author',
        header: t('admin', 'assets.col.owner'),
        meta: {
          headClassName: 'w-[var(--cw-author)]',
          cellClassName: 'text-muted-foreground',
          hidable: true,
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          <div className="truncate">{ownerText(row.original)}</div>
        ),
      },
      {
        id: 'version',
        header: t('assets', 'col.version'),
        meta: {
          headClassName: 'w-[var(--cw-version)]',
          cellClassName: 'text-muted-foreground tabular-nums',
          hidable: true,
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          <div className="truncate">{row.original.latestVersion ?? '—'}</div>
        ),
      },
      {
        accessorKey: 'downloadCount',
        header: t('assets', 'col.download'),
        meta: {
          headClassName: 'w-[var(--cw-downloadCount)] text-right',
          cellClassName: 'text-right',
          sortable: true,
          naturalDir: 'desc',
          sortKey: 'downloads',
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          <AssetStat kind="download" count={row.original.downloadCount} />
        ),
      },
      {
        accessorKey: 'starCount',
        header: t('assets', 'col.star'),
        meta: {
          headClassName: 'w-[var(--cw-starCount)] text-right',
          cellClassName: 'text-right',
          sortable: true,
          naturalDir: 'desc',
          /** 「收藏」列 ⟷ `stars` 档位（门户同列同名） */
          sortKey: 'stars',
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          <AssetStat kind="star" count={row.original.starCount} />
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: t('assets', 'col.updated'),
        meta: {
          headClassName: 'w-[var(--cw-updatedAt)]',
          cellClassName: 'text-muted-foreground tabular-nums',
          sortable: true,
          naturalDir: 'desc',
          sortKey: 'newest',
        } satisfies ColumnUiMeta,
        cell: ({ row }: { row: { original: AssetItem } }) => (
          <div className="truncate">{formatDate(row.original.updatedAt)}</div>
        ),
      },
    ],
    [t],
  );
}

/** 列显示菜单项（`t` 进函数 —— 语言切换后菜单文案随动） */
const columnItemsOf = (t: Translate): ColumnToggleItem[] => [
  { key: 'slug', label: t('assets', 'col.name'), hidable: false },
  { key: 'desc', label: t('market', 'colDesc'), hidable: true },
  { key: 'type', label: t('assets', 'col.type'), hidable: true },
  { key: 'status', label: t('assets', 'col.status'), hidable: true },
  { key: 'author', label: t('admin', 'assets.col.owner'), hidable: true },
  { key: 'version', label: t('assets', 'col.version'), hidable: true },
  { key: 'downloadCount', label: t('assets', 'col.download'), hidable: true },
  { key: 'starCount', label: t('assets', 'col.star'), hidable: true },
  { key: 'updatedAt', label: t('assets', 'col.updated'), hidable: true },
  { key: 'rowActions', label: t('assets', 'col.actions'), hidable: false },
];

/** 卡片视图载态骨架槽位（门户 / 控制台「我的资产」同款：8 壳 = 1440 断点首屏可见量） */
const LOADING_SLOTS = ['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6', 'sk7', 'sk8'];

/** 视图形态（`k1` 口径：默认**列表**（操作态）· 切换**不落 URL、不落存储**） */
type ViewMode = 'list' | 'grid';

export function AdminAssetsProto() {
  const query = useMarketQuery({ sort: { defaultValue: 'newest' } });
  const { q, setQ, committedQ, labels, toggleLabel, clearLabels, page, setPage } = query;
  /**
   * 排序档位 / 方向：URL 值经**白名单归一**（非法值回落 `newest`，与服务端「静默回落」同口径）。
   * 档位**三档**（`newest`/`downloads`/`stars`）= 服务端 `ASSET_SORT_VALUES` 同值域 ⇒ 表里恰好三列可点：
   * 「更新」⟷ `newest` · 「下载」⟷ `downloads` · 「收藏」⟷ `stars`。
   */
  const sort: SortKey = isSortKey(query.sort) ? query.sort : 'newest';
  const dir = query.dir;
  const { t } = useI18n();
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  /** 状态筛选（第 4 入口 · Q5 拍板）：默认「全部」= URL 默认 `status=ALL`（§4.8(b) · D20「管理档看全站」） */
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [retryTick, setRetryTick] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState<AssetItem | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const { data: stats } = useApi((signal) => fetchStats({ signal }), []);
  const labelsKey = labels.join(',');
  const {
    data: list,
    error,
    loading,
  } = useApi(
    (signal) =>
      fetchAssetList(
        {
          type: typeFilter === ALL ? undefined : (typeFilter as AssetItem['type']),
          q: committedQ || undefined,
          labels: labels.length > 0 ? labels : undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          sort,
          dir,
          /* `status` 属本批服务端改动 4 的新参（web 客户端类型实现期一并加）⇒ 原型内用交叉类型绕过 */
          status: statusFilter === ALL ? 'ALL' : statusFilter,
        } as AssetListParams & { status?: string },
        { signal },
      ),
    [typeFilter, statusFilter, committedQ, labelsKey, page, retryTick, sort, dir],
  );

  /**
   * 列头可点排序（两态，与门户 `CenterPage.handleHeaderSort` **同口径**）：点**同列** ⇒ 写 `dir` 反向；
   * 点**异列** ⇒ `setSort(档, 'desc')`（首点降序 —— 官方配方 `toggleSorting(false)`）。两者内部均回第 1 页。
   */
  function handleHeaderSort(key: string, nextDir: 'asc' | 'desc') {
    if (!isSortKey(key)) return;
    if (key === sort) query.setDir?.(nextDir);
    else query.setSort?.(key, nextDir);
  }

  const columns = useColumns();
  /** 可见列宽度变量（隐藏列后等比例摊开 —— 见 `useColumnVars` 注释） */
  const columnVars = useColumnVars(columnVisibility) as CSSProperties;
  const hiddenCount = Object.values(columnVisibility).filter((v) => v === false).length;
  const sorting: TableSortingProps = { key: sort, dir, onChange: handleHeaderSort };
  const filtersActive =
    labels.length > 0 || committedQ !== '' || statusFilter !== ALL || typeFilter !== ALL;
  const total = list?.total ?? 0;

  return (
    /* CSS 变量挂在**表格祖先**上 ⇒ `w-[var(--cw-*)]` 在表头与单元格同时生效 */
    <div className="flex flex-col py-6" style={columnVars}>
      <div className="px-4 lg:px-6">
        {/* 页头卡（门户 CenterPage 同构：icon tile + h1 + eyebrow + 右侧计数块） */}
        <Card className="mb-4 flex flex-row items-center gap-5 px-[26px] py-[22px]">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-primary text-white">
            <Gauge className="size-[22px]" aria-hidden />
          </span>
          <CardHeader className="relative min-w-0 flex-1 gap-0 p-0">
            <h1 className="text-xl font-bold tracking-[-0.4px]">{t('admin', 'assets')}</h1>
            <span className="text-[11px] font-semibold tracking-[1px] text-muted-foreground uppercase">
              ADMIN
            </span>
            <p className="mt-1 text-[13px] text-muted-foreground">{t('admin', 'assets.desc')}</p>
          </CardHeader>
          <div className="shrink-0 rounded-xl border border-border bg-secondary px-5 py-2.5 text-center">
            <b className="block text-[22px] leading-tight font-bold text-primary tabular-nums">
              {stats ? stats.totalAssets.toLocaleString() : '—'}
            </b>
            <span className="text-[11px] whitespace-nowrap text-muted-foreground">
              {t('board', 'kpi.assets')}
            </span>
          </div>
        </Card>

        <FilterStrip selected={labels} onToggle={toggleLabel} onClearAll={clearLabels} />

        <Collapsible open={searchOpen} onOpenChange={setSearchOpen} className="mb-3">
          <div className="flex items-center gap-3 px-0.5">
            <span className="text-[13px] text-muted-foreground">
              {filtersActive
                ? t('admin', 'assets.countFiltered', { n: total })
                : t('admin', 'assets.countAll', { n: total })}
            </span>
            <div className="ml-auto flex items-center gap-3">
              {/* 状态筛选（第 4 入口 · 治理场景主入口：只看隐藏 / 归档） */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="w-[130px]"
                  aria-label={t('admin', 'assets.filter.statusAria')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('admin', 'assets.filter.statusAll')}</SelectItem>
                  <SelectItem value="ACTIVE">{t('assets', 'filter.status.active')}</SelectItem>
                  <SelectItem value="HIDDEN">{t('assets', 'filter.status.hidden')}</SelectItem>
                  <SelectItem value="ARCHIVED">{t('assets', 'filter.status.archived')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger
                  size="sm"
                  className="w-[130px]"
                  aria-label={t('admin', 'assets.filter.typeAria')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('admin', 'assets.filter.typeAll')}</SelectItem>
                  <SelectItem value="skill">{t('assets', 'type.skill')}</SelectItem>
                  <SelectItem value="mcp">MCP Server</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
              {/* 列显示入口：**仅列表视图渲染** —— 卡片形态没有列的概念（门户口径） */}
              {view === 'list' ? (
                <ColumnVisibilityMenu
                  items={columnItemsOf(t)}
                  value={columnVisibility}
                  onChange={setColumnVisibility}
                  label={t('market', 'colShow')}
                  labels={{ required: t('market', 'colRequired'), reset: t('market', 'colReset') }}
                  badgeCount={hiddenCount}
                />
              ) : null}
              {/* 排序档位入口：与列头**同源**（同一 URL `sort`/`dir`）⇒ 两处永远一致（门户同款） */}
              <SortMenu value={sort} onChange={(next) => query.setSort?.(next)} />
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('market', 'searchBtn')}
                  title={t('market', 'searchBtn')}
                >
                  <Search />
                </Button>
              </CollapsibleTrigger>
              {/* 视图切换（门户 / 控制台「我的资产」同款：官方 `ToggleGroup`，唯一「有框」控件 · 显示态） */}
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
                  <ListIcon />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <CollapsibleContent>
            <InputGroup className="mt-2">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('admin', 'assets.searchPlaceholder')}
                aria-label={t('admin', 'assets.searchLabel')}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={t('market', 'searchClose')}
                  title={t('market', 'searchClose')}
                  onClick={() => {
                    setQ('');
                    setSearchOpen(false);
                  }}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </CollapsibleContent>
        </Collapsible>

        {error ? <ErrorState error={error} onRetry={() => setRetryTick((n) => n + 1)} /> : null}
        {!error && !loading && list && list.items.length === 0 ? (
          <EmptyState message={t('assets', 'empty.filtered')} />
        ) : null}
        {!error && (loading || (list && list.items.length > 0)) ? (
          view === 'grid' ? (
            /* 卡片视图：复用门户同件 `AssetGrid`/`AssetCard` + **状态徽标槽**（`StatusPill kind="asset"`）
               —— 与控制台「我的资产」同口径；载态 = 门户同款 8 槽 Skeleton；
               点卡片 = `AssetCard` 自带覆盖层 Link（**门户原生行为**：进资产详情页） */
            <AssetGrid>
              {loading
                ? LOADING_SLOTS.map((slot) => (
                    <Skeleton key={slot} className="h-[166px] rounded-xl" />
                  ))
                : (list?.items ?? []).map((item) => (
                    <AssetCard
                      key={item.id}
                      item={item}
                      status={
                        <StatusPill
                          kind="asset"
                          status={item.status}
                          label={statusLabel(t, item.status)}
                        />
                      }
                    />
                  ))}
              {!loading && (list?.items ?? []).length === 0 ? (
                <Empty className="col-span-full py-10">
                  <EmptyHeader>
                    <EmptyTitle>{t('assets', 'empty.filtered')}</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : null}
            </AssetGrid>
          ) : (
            <DataTable
              columns={columns as never}
              data={(list?.items ?? []) as never}
              getRowId={(item: AssetItem) => String(item.id)}
              loading={loading}
              loadingVariant="keepHeader"
              density="default"
              tableClassName="table-fixed"
              rowProps={(item: AssetItem) => ({
                'data-asset-row': item.slug,
                className: 'cursor-pointer hover:bg-muted/50',
                onClick: () => setCurrent(item),
              })}
              sorting={sorting}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              emptyMessage={t('assets', 'empty.filtered')}
              rowActions={(item: AssetItem) => (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t('submissions', 'action.view')}
                  title={t('submissions', 'action.view')}
                  onClick={() => setCurrent(item)}
                >
                  <Eye className="size-4" />
                </Button>
              )}
              rowActionsHeader={t('assets', 'col.actions')}
              rowActionsLabel={t('assets', 'col.actions')}
            />
          )
        ) : null}

        {total > PAGE_SIZE ? (
          <Pagination
            total={total}
            limit={PAGE_SIZE}
            offset={(page - 1) * PAGE_SIZE}
            onPageChange={(next) => {
              setPage(Math.floor(next / PAGE_SIZE) + 1);
              window.scrollTo({ top: 0 });
            }}
          />
        ) : null}
      </div>

      {/* 抽屉：复用仓内既有 `console/Drawer`（官方 `Sheet` 薄封装 · 主 design §6.3 已定宽 560 + 必带 Title）
          —— 只读态（管理动作仍归资产详情页管理区） */}
      <Drawer
        open={current !== null}
        onOpenChange={(open) => {
          if (!open) setCurrent(null);
        }}
        title={current?.latestName ?? current?.slug ?? ''}
        description={t('admin', 'assets.drawerDesc')}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setCurrent(null)}>
              {t('common', 'close')}
            </Button>
            <Button size="sm" asChild>
              <Link to={`/assets/${encodeURIComponent(current?.slug ?? '')}`}>
                {t('admin', 'assets.openFull')}
              </Link>
            </Button>
          </div>
        }
      >
        {current ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">slug</dt>
              <dd className="col-span-2 font-medium">{current.slug}</dd>
              <dt className="text-muted-foreground">{t('assets', 'col.type')}</dt>
              <dd className="col-span-2">{typeLabel(t, current.type)}</dd>
              <dt className="text-muted-foreground">{t('assets', 'col.status')}</dt>
              <dd className="col-span-2">
                <StatusCell status={current.status} />
              </dd>
              <dt className="text-muted-foreground">{t('admin', 'assets.col.owner')}</dt>
              <dd className="col-span-2">{ownerText(current)}</dd>
              <dt className="text-muted-foreground">{t('assets', 'col.version')}</dt>
              <dd className="col-span-2 tabular-nums">{current.latestVersion ?? '—'}</dd>
              <dt className="text-muted-foreground">{t('assets', 'col.download')}</dt>
              <dd className="col-span-2 tabular-nums">{current.downloadCount.toLocaleString()}</dd>
              <dt className="text-muted-foreground">{t('assets', 'col.star')}</dt>
              <dd className="col-span-2 tabular-nums">{current.starCount}</dd>
              <dt className="text-muted-foreground">{t('assets', 'col.updated')}</dt>
              <dd className="col-span-2 tabular-nums">{formatDate(current.updatedAt)}</dd>
            </dl>
            {/* 描述（`AssetItem.latestDescription` —— 与门户列表「描述」列/卡片描述**同字段**，零新增请求） */}
            <Separator />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">{t('market', 'colDesc')}</span>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {current.latestDescription ?? '—'}
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

export default AdminAssetsProto;
