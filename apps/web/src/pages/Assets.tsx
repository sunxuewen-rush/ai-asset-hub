/**
 * 我的资产 `/dashboard/assets`（M4b-4 批 design §4.2 列集合 · 批 plan **T7**）。
 *
 * 契约（引用不复制）：
 * - 数据源 `GET /api/me/assets?status=&q=&limit=&offset=`（R6 个人面；`status` 缺省 = `ALL` 含三态）
 * - 列集合 **9 列**（§4.2）：`名称 · 类型 · 状态 · 标签 · 版本 · 下载 · 收藏 · 更新 · 操作`
 *
 * 关键口径（§2.1d 原型评审 R1–R23 + §4.2/§4.3）：
 * - **操作列 = `Eye` 图标钮「真链接」直跳 `/assets/:slug`**（R4/R5 + v1.9 抽屉取消 ⇒ 列表 ↔ 详情**零中间态**）
 * - **无行菜单**（`⋯` 菜单已废）· **无抽屉**
 * - **类型列无彩底**：`TypeIcon` 是仓内自绘件（签名仅 `{type,size}`、颜色走 `stroke="currentColor"`）
 *   ⇒ 用外层 `span` 定色（`text-muted-foreground`），**不传 className**（R14）
 * - **下载/收藏列图标一律无色**（R23；星形态由详情页头卡按钮表达，列表只读数值）
 * - **标签列** = 结构体 `displayName`（T14 已解析语种）· 最多 **2** 枚 + `+N`，`title` 挂全量
 * - URL 状态化：`useMarketQuery({ status })`（`?q=` 300ms 防抖 · `?status=` · `?page=`；筛选变更 **回第 1 页**）
 */

import type { LegacyColumnDef } from '@tanstack/react-table/legacy';
import { Eye, LayoutGrid, List, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyAssets } from '@/api/me';
import type { AssetItem, AssetStatus } from '@/api/types';
import { AssetStat } from '@/components/console/asset-stats';
import { PageHeader } from '@/components/console/PageHeader';
import { StatusPill } from '@/components/console/StatusPill';
import { AssetCard, AssetGrid } from '@/components/market/AssetCard';
import { formatDate } from '@/components/market/format';
import { SortMenu } from '@/components/market/SortMenu';
import { isSortKey, type SortKey } from '@/components/market/sortOptions';
import { AssetAvatar } from '@/components/ui/AssetAvatar';
import { type ColumnToggleItem, ColumnVisibilityMenu } from '@/components/ui/ColumnVisibilityMenu';
import { type ColumnUiMeta, DataTable, type TableSortingProps } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/shadcn/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shadcn/collapsible';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/shadcn/empty';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/shadcn/input-group';
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
import { TypeIcon } from '@/components/ui/TypeIcon';
import { useApi } from '@/hooks/useApi';
import { type SortDir, useMarketQuery } from '@/hooks/useMarketQuery';
import { type DictKey, useI18n } from '@/i18n/I18nProvider';

/** 「全部」哨兵（**仅前端**；服务端默认即 `ALL`，切回全部时删除 URL 参数） */
const ALL = 'ALL';

/** 视图形态（`k1` 追加 · 与门户同口径：**默认列表**（操作态）· 切换不记忆） */
type ViewMode = 'grid' | 'list';

/** 网格载态槽位（沿门户 `CenterPage` 同款：4 列 × 2 行 · 槽位名做 `key`） */
const LOADING_SLOTS = ['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6', 'sk7', 'sk8'];

/** 服务端三态（`08 §5.1`） */
const STATUS_OPTIONS: readonly AssetStatus[] = ['ACTIVE', 'HIDDEN', 'ARCHIVED'];

/**
 * 「我的资产」列集合（**单一源** —— 与列定义同序 · `T11-k`）：列开关菜单按本表逐项渲染。
 * `hidable: false` = 保护列（名称；`操作` 是槽列 ⇒ 哨兵 id + 置灰）。列集合的**漂移守护** =
 * 运行期探针断言「菜单项 ↔ 表头列」**1:1**（同门户 `PORTAL_COLUMNS` 习惯）。
 */
const CONSOLE_COLUMNS: ReadonlyArray<{
  key: string;
  labelKey: DictKey<'assets'>;
  hidable: boolean;
}> = [
  { key: 'slug', labelKey: 'col.name', hidable: false },
  { key: 'type', labelKey: 'col.type', hidable: true },
  { key: 'status', labelKey: 'col.status', hidable: true },
  { key: 'labels', labelKey: 'col.labels', hidable: true },
  { key: 'latestVersion', labelKey: 'col.version', hidable: true },
  { key: 'downloadCount', labelKey: 'col.download', hidable: true },
  { key: 'starCount', labelKey: 'col.star', hidable: true },
  { key: 'updatedAt', labelKey: 'col.updated', hidable: true },
  { key: 'rowActions', labelKey: 'col.actions', hidable: false },
];

/** 状态 → i18n 键单点映射（`satisfies` 保证键名与字典对齐） */
const STATUS_KEY = {
  ACTIVE: 'filter.status.active',
  HIDDEN: 'filter.status.hidden',
  ARCHIVED: 'filter.status.archived',
} as const satisfies Record<AssetStatus, string>;

/** 类型 → i18n 键（F46：§6.1 原称复用 `market` 组键，实测不存在 ⇒ `assets` 组新建 3 键） */
const TYPE_KEY = {
  skill: 'type.skill',
  mcp: 'type.mcp',
  agent: 'type.agent',
} as const satisfies Record<AssetItem['type'], string>;

/** 标签列最多直接展示的 chip 数（其余折成 `+N`；全量在 `title` 里） */
const MAX_CHIPS = 2;

/** 列表页每页条数（与后端默认 20 对齐） */
const PAGE_LIMIT = 20;

export function Assets() {
  const { t } = useI18n();
  const [retryTick, setRetryTick] = useState(0);
  /** 折叠搜索（`k1` · **对齐门户 T11-e 形态**）：默认收起 · 展开时聚焦输入框 */
  const [searchOpen, setSearchOpen] = useState(false);
  /** 视图切换（`k1` 追加）：默认**列表** · 不持久化（同门户「切视图不记忆」） */
  const [view, setView] = useState<ViewMode>('list');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  const query = useMarketQuery({ status: { defaultValue: ALL }, sort: { defaultValue: 'newest' } });
  const status = (query.status ?? ALL) as AssetStatus | typeof ALL;
  const offset = (query.page - 1) * PAGE_LIMIT;
  /** 列显示（`k1` · 受控 · **不持久化** —— 与门户口径一致） */
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  /** 已隐藏列数（`> 0` ⇒ 触发钮显角标 · `j6` 口径） */
  const hiddenColumnCount = Object.values(columnVisibility).filter(
    (visible) => visible === false,
  ).length;

  /**
   * 列头排序落 URL（D0-5：**只列头可点** · 不加门户那个排序菜单）。
   *
   * - 档位由列 `meta.sortKey` 携带（D5）⇒ 回调 `key` **就是**服务端白名单档位；
   *   仍以 `isSortKey` 兜一道 ⇒ 白名单外**不落 URL**（F89 复发防线 · 同门户口径）。
   * - **回第 1 页（Q2）**由 `useMarketQuery.setSort` / `setDir` **内置** `dropPage` 承担 ⇒ 页面不重复实现。
   */
  function handleHeaderSort(key: string, nextDir: SortDir) {
    if (!isSortKey(key)) return;
    if (key === query.sort) query.setDir?.(nextDir);
    else query.setSort?.(key, nextDir);
  }

  const { data, error, loading } = useApi(
    (signal) =>
      fetchMyAssets(
        {
          status,
          q: query.committedQ.length > 0 ? query.committedQ : undefined,
          sort: query.sort,
          dir: query.dir,
          limit: PAGE_LIMIT,
          offset,
        },
        { signal },
      ),
    [status, query.committedQ, query.sort, query.dir, offset, retryTick],
  );

  const filtersActive = status !== ALL || query.committedQ.length > 0;
  // 「从未有资产」与「筛选无结果」两文案（design §6.1 `empty.title|hint` vs `empty.filtered`）
  const emptyPage = !loading && !error && !filtersActive && (data?.total ?? 0) === 0;

  const columns = useMemo<Array<LegacyColumnDef<AssetItem, unknown>>>(
    () => [
      {
        accessorKey: 'slug',
        header: t('assets', 'col.name'),
        meta: {
          /** 保护列（`k1` · D0-7）：不可隐藏（列开关消费于本笔） */
          hidable: false,
        } satisfies ColumnUiMeta,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/* 首字母色块（`k1` · 与门户/卡片**同源件**）：控制台行高 40（操作态）⇒ **20px** 档 */}
            <AssetAvatar name={row.original.latestName ?? row.original.slug} size={20} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">
                {row.original.latestName ?? row.original.slug}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {row.original.slug}
              </span>
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: t('assets', 'col.type'),
        cell: ({ row }) => (
          // R14：无色图标 + 文案（外层定色 —— TypeIcon 无 className prop）
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <TypeIcon type={row.original.type} size={16} />
            {t('assets', TYPE_KEY[row.original.type])}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('assets', 'col.status'),
        cell: ({ row }) => (
          <StatusPill
            kind="asset"
            status={row.original.status}
            label={t('assets', STATUS_KEY[row.original.status])}
          />
        ),
      },
      {
        accessorKey: 'labels',
        header: t('assets', 'col.labels'),
        cell: ({ row }) => {
          const labels = row.original.labels ?? [];
          if (labels.length === 0) return <span className="text-muted-foreground">—</span>;
          const shown = labels.slice(0, MAX_CHIPS);
          const rest = labels.length - shown.length;
          return (
            <span
              className="flex flex-wrap items-center gap-1"
              title={labels.map((label) => label.displayName).join(' / ')}
            >
              {shown.map((label) => (
                <span
                  key={label.slug}
                  className="inline-flex items-center rounded-full bg-secondary px-2 py-[1px] text-[11px] font-medium text-secondary-foreground"
                >
                  {label.displayName}
                </span>
              ))}
              {rest > 0 ? (
                <span className="text-[11px] tabular-nums text-muted-foreground">+{rest}</span>
              ) : null}
            </span>
          );
        },
      },
      {
        accessorKey: 'latestVersion',
        header: t('assets', 'col.version'),
        cell: ({ row }) =>
          row.original.latestVersion === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-mono text-[12px] tabular-nums">{row.original.latestVersion}</span>
          ),
      },
      {
        accessorKey: 'downloadCount',
        header: t('assets', 'col.download'),
        meta: {
          /** 列头可点（D0-5）：档位**由本列携带**（D5）—— `key` 即服务端白名单档位 */
          sortable: true,
          naturalDir: 'desc',
          sortKey: 'downloads',
        } satisfies ColumnUiMeta,
        cell: ({ row }) => (
          // R23：列表数值图标一律无色（`asset-stats` 共用件 —— M4b-4 T12 抽件，与详情页元信息卡同件）
          <AssetStat kind="download" count={row.original.downloadCount} />
        ),
      },
      {
        accessorKey: 'starCount',
        header: t('assets', 'col.star'),
        meta: {
          /** 列头可点（D0-5）：档位**由本列携带**（D5）—— `key` 即服务端白名单档位 */
          sortable: true,
          naturalDir: 'desc',
          sortKey: 'stars',
        } satisfies ColumnUiMeta,
        cell: ({ row }) => <AssetStat kind="star" count={row.original.starCount} />,
      },
      {
        accessorKey: 'updatedAt',
        header: t('assets', 'col.updated'),
        meta: {
          /** 列头可点（D0-5）· **列名 ≠ 档名**：本列映射 `newest` 档（D5=① 由 `meta.sortKey` 表达） */
          sortable: true,
          naturalDir: 'desc',
          sortKey: 'newest',
        } satisfies ColumnUiMeta,
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [t],
  );

  /**
   * 菜单项 = **列定义单一源**（列名取 `header`、可隐藏性取 `meta.hidable`）+ **动作槽列哨兵**。
   * 槽列不在 `columns` 内（`rowActions` 槽）⇒ 无列 id、天然不可隐藏 ⇒ 哨兵 id `rowActions`。
   */
  const columnItems = useMemo<ColumnToggleItem[]>(
    () =>
      CONSOLE_COLUMNS.map((column) => ({
        key: column.key,
        label: t('assets', column.labelKey),
        hidable: column.hidable,
      })),
    [t],
  );

  /** 排序档位（卡片态用排序图标钮 ⇒ 需 `SortKey` 归一；非法值回落默认档） */
  const sortKey: SortKey = isSortKey(query.sort ?? '') ? (query.sort as SortKey) : 'newest';

  /** 排序契约（列表态 = 只列头可点（D0-5）；卡片态无列头 ⇒ 工具条排序图标钮提供入口） */
  const sorting: TableSortingProps = {
    key: query.sort,
    dir: query.dir,
    onChange: handleHeaderSort,
  };

  return (
    <>
      <PageHeader title={t('assets', 'title')} description={t('assets', 'description')} />

      {/* 工具条（`k1`）：外层 = 官方 `Collapsible` ⇒ 搜索入口与门户**同形**（无框图标钮 + 下方撑满面板） */}
      <Collapsible open={searchOpen} onOpenChange={setSearchOpen} className="mb-3">
        <div className="flex flex-wrap items-center gap-3 px-0.5">
          <Label htmlFor="assets-status-filter" className="text-muted-foreground">
            {t('assets', 'col.status')}
          </Label>
          <Select value={status} onValueChange={(next) => query.setStatus?.(next)}>
            <SelectTrigger id="assets-status-filter" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('assets', 'filter.status.all')}</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t('assets', STATUS_KEY[option])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* 右侧控件群（`k1`）：`ml-auto` 由**容器**承担（同门户 `j6` 口径） */}
          <div className="ml-auto flex items-center gap-3">
            {/* 列显示入口（`k1` · 仅**列表态**渲染 —— 卡片形态没有列的概念，同门户口径） */}
            {view === 'list' && (
              <ColumnVisibilityMenu
                items={columnItems}
                value={columnVisibility}
                onChange={setColumnVisibility}
                label={t('market', 'colShow')}
                labels={{ required: t('market', 'colRequired'), reset: t('market', 'colReset') }}
                badgeCount={hiddenColumnCount}
              />
            )}
            {/* 排序（`k1` 追加 · **仅卡片态**）：卡片无列头 ⇒ 与门户同款无框图标钮 + 三档菜单；
                列表态沿用 D0-5「只列头可点」⇒ 不渲染本钮（两态各一套入口，互不重叠） */}
            {view === 'grid' && (
              <SortMenu value={sortKey} onChange={(next) => query.setSort?.(next)} />
            )}
            {/* 折叠搜索触发钮（`k1`）：官方 `Button`（ghost · icon-sm）+ lucide `Search` —— **对齐门户** */}
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
            {/* 视图切换（`k1` 追加 · 对齐门户）：官方 `ToggleGroup` —— 唯一「有框」控件（**选值**语义） */}
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
        </div>
        {/* 折叠搜索面板：工具条**下方** · 宽度撑满 —— 官方 `InputGroup`（放大镜 addon + 无边框输入 + 尾部关闭钮），
            与门户 `CenterPage` 逐字同构（`T11-e` 形态） */}
        <CollapsibleContent>
          <InputGroup className="mt-2">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              value={query.q}
              onChange={(event) => query.setQ(event.target.value)}
              placeholder={t('assets', 'filter.search')}
              aria-label={t('assets', 'filter.search')}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label={t('market', 'searchClose')}
                title={t('market', 'searchClose')}
                onClick={() => {
                  query.setQ('');
                  setSearchOpen(false);
                }}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </CollapsibleContent>
      </Collapsible>

      {emptyPage ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle>{t('assets', 'empty.title')}</EmptyTitle>
            <EmptyDescription>{t('assets', 'empty.hint')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : view === 'grid' ? (
        /* 卡片视图（`k1` 追加 · 复用门户同件 `AssetGrid`/`AssetCard` + **状态徽标槽**）：
           载态 = 门户同款 Skeleton 槽位；筛选无结果 = 与列表态同文案（`empty.filtered`） */
        <AssetGrid>
          {loading
            ? LOADING_SLOTS.map((slot) => <Skeleton key={slot} className="h-[166px] rounded-xl" />)
            : (data?.items ?? []).map((item) => (
                <AssetCard
                  key={item.id}
                  item={item}
                  status={
                    <StatusPill
                      kind="asset"
                      status={item.status}
                      label={t('assets', STATUS_KEY[item.status])}
                    />
                  }
                />
              ))}
          {!loading && (data?.items ?? []).length === 0 ? (
            <Empty className="col-span-full py-10">
              <EmptyHeader>
                <EmptyTitle>{t('assets', 'empty.filtered')}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : null}
        </AssetGrid>
      ) : (
        <DataTable<AssetItem>
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => String(row.id)}
          loading={loading}
          error={error}
          onRetry={() => setRetryTick((n) => n + 1)}
          emptyMessage={t('assets', 'empty.filtered')}
          sorting={sorting}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          rowActionsLabel={t('assets', 'col.actions')}
          rowActionsHeader={t('assets', 'col.actions')}
          rowActions={(row) => (
            // R4/R5：单图标钮 · **真链接**直跳完整详情页（零中间态）
            <Button
              asChild
              size="icon-sm"
              variant="ghost"
              aria-label={t('assets', 'action.open')}
              title={t('assets', 'action.open')}
            >
              <Link to={`/assets/${row.slug}`}>
                <Eye className="size-4" />
              </Link>
            </Button>
          )}
        />
      )}

      {/* 分页：仅 `total > limit` 时渲染（与 M4b-3 / M4a 同口径 —— 单页不显示「1 / 1」噪音） */}
      {data && data.total > PAGE_LIMIT ? (
        <Pagination
          total={data.total}
          limit={PAGE_LIMIT}
          offset={offset}
          onPageChange={(nextOffset) => query.setPage(Math.floor(nextOffset / PAGE_LIMIT) + 1)}
        />
      ) : null}
    </>
  );
}
