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
import { Download, Eye, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyAssets } from '@/api/me';
import type { AssetItem, AssetStatus } from '@/api/types';
import { DataTable } from '@/components/console/DataTable';
import { PageHeader } from '@/components/console/PageHeader';
import { StatusPill } from '@/components/console/StatusPill';
import { compactCount, formatDate } from '@/components/market/format';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/shadcn/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/shadcn/empty';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import { TypeIcon } from '@/components/ui/TypeIcon';
import { useApi } from '@/hooks/useApi';
import { useMarketQuery } from '@/hooks/useMarketQuery';
import { useI18n } from '@/i18n/I18nProvider';

/** 「全部」哨兵（**仅前端**；服务端默认即 `ALL`，切回全部时删除 URL 参数） */
const ALL = 'ALL';

/** 服务端三态（`08 §5.1`） */
const STATUS_OPTIONS: readonly AssetStatus[] = ['ACTIVE', 'HIDDEN', 'ARCHIVED'];

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
  const query = useMarketQuery({ status: { defaultValue: ALL } });
  const status = (query.status ?? ALL) as AssetStatus | typeof ALL;
  const offset = (query.page - 1) * PAGE_LIMIT;

  const { data, error, loading } = useApi(
    (signal) =>
      fetchMyAssets(
        {
          status,
          q: query.committedQ.length > 0 ? query.committedQ : undefined,
          limit: PAGE_LIMIT,
          offset,
        },
        { signal },
      ),
    [status, query.committedQ, offset, retryTick],
  );

  const filtersActive = status !== ALL || query.committedQ.length > 0;
  // 「从未有资产」与「筛选无结果」两文案（design §6.1 `empty.title|hint` vs `empty.filtered`）
  const emptyPage = !loading && !error && !filtersActive && (data?.total ?? 0) === 0;

  const columns = useMemo<Array<LegacyColumnDef<AssetItem, unknown>>>(
    () => [
      {
        accessorKey: 'slug',
        header: t('assets', 'col.name'),
        cell: ({ row }) => (
          <span className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.latestName ?? row.original.slug}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{row.original.slug}</span>
          </span>
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
        cell: ({ row }) => (
          // R23：列表数值图标一律无色
          <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
            <Download className="size-3.5" />
            {compactCount(row.original.downloadCount)}
          </span>
        ),
      },
      {
        accessorKey: 'starCount',
        header: t('assets', 'col.star'),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
            <Star className="size-3.5" />
            {compactCount(row.original.starCount)}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: t('assets', 'col.updated'),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <>
      <PageHeader title={t('assets', 'title')} description={t('assets', 'description')} />

      <div className="mb-3 flex flex-wrap items-center gap-3">
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
        <Input
          value={query.q}
          onChange={(event) => query.setQ(event.target.value)}
          placeholder={t('assets', 'filter.search')}
          aria-label={t('assets', 'filter.search')}
          className="ml-auto w-[240px]"
        />
      </div>

      {emptyPage ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle>{t('assets', 'empty.title')}</EmptyTitle>
            <EmptyDescription>{t('assets', 'empty.hint')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable<AssetItem>
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => String(row.id)}
          loading={loading}
          error={error}
          onRetry={() => setRetryTick((n) => n + 1)}
          emptyMessage={t('assets', 'empty.filtered')}
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
