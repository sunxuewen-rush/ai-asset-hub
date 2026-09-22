/**
 * 审核管理 `/admin/reviews`（批 design §4.1 列集合 · 批 plan T7）。
 *
 * 契约（引用不复制）：
 * - 数据源 `GET /api/reviews?status=&limit=&offset=`（**管理档起**；item = `ReviewListItem` 同形）
 * - 行「查看」⇒ `/reviews/:id`（**审核动作在详情页**，不在列表 —— design §4.1 操作列 = 真链接进详情）
 *
 * 关键纪律（同「我的提交」口径）：
 * - **「全部」= 不带 `status` 参数** —— 服务端对非法值**静默忽略** ⇒ 绝不传 `ALL` / 空串；`ALL` 只是本页 Select 的前端哨兵。
 * - 筛选与分页 **URL 状态化**（`?status=&limit=&offset=`）—— 刷新保持、浏览器后退可回。
 * - 排序：**不开排序头**（服务端固定 `submittedAt desc`；design Q2 定案）⇒ 不传 `sorting`。
 * - 列开关：复用 `ui/ColumnVisibilityMenu`；**保护 2 列**（资产 / 操作）⇒ `meta.hidable = false`。
 * - 状态徽章 `StatusPill kind="task"`；状态文案 `review.status.*`（**本批 T4 落键**）。
 * - 标题真源 = 字典 `admin.reviews`（zh「审核管理」· P3 按真源统一，禁自造文案）。
 */
import type { LegacyColumnDef } from '@tanstack/react-table/legacy';
import { Eye } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchReviewQueue, type MyReviewItem, type ReviewStatus } from '@/api/reviews';
import { PageHeader } from '@/components/console/PageHeader';
import { StatusPill } from '@/components/console/StatusPill';
import { type ColumnToggleItem, ColumnVisibilityMenu } from '@/components/ui/ColumnVisibilityMenu';
import { DataTable } from '@/components/ui/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/shadcn/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/shadcn/empty';
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
import { useI18n } from '@/i18n/I18nProvider';

/** 「全部」哨兵：**只存在于前端**，映射为「不带 `status` 参数」 */
const ALL = '__all__';

const STATUS_OPTIONS: readonly ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

/** 状态 → i18n 键单点映射（禁在 JSX 里散写三元链） */
const STATUS_KEY = {
  PENDING: 'status.pending',
  APPROVED: 'status.approved',
  REJECTED: 'status.rejected',
  WITHDRAWN: 'status.withdrawn',
} as const satisfies Record<ReviewStatus, string>;

const PAGE_LIMIT = 20;

/** 参与列开关的列（**不含受保护两列** —— 保护由 `meta.hidable = false` + `columnItems[].hidable = false` 双处声明） */
const ALL_COLUMN_IDS = [
  'assetSlug',
  'assetType',
  'status',
  'submittedByName',
  'submittedBy',
  'submittedAt',
] as const;

export function ReviewQueue() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [retryTick, setRetryTick] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  const rawStatus = searchParams.get('status');
  const status = STATUS_OPTIONS.includes(rawStatus as ReviewStatus)
    ? (rawStatus as ReviewStatus)
    : undefined;
  const offset = Math.max(0, Number(searchParams.get('offset') ?? '') || 0);
  const limit = Number(searchParams.get('limit') ?? '') || PAGE_LIMIT;

  const { data, error, loading } = useApi(
    (signal) => fetchReviewQueue({ status, limit, offset }, { signal }),
    [status, limit, offset, retryTick],
  );

  const applyParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      setSearchParams(next);
      window.scrollTo(0, 0);
    },
    [searchParams, setSearchParams],
  );

  const onStatusChange = (value: string) => {
    applyParams((next) => {
      if (value === ALL) next.delete('status');
      else next.set('status', value);
      next.delete('offset'); // 筛选变更 ⇒ 回第一页
    });
  };

  const onPageChange = (nextOffset: number) => {
    applyParams((next) => {
      if (nextOffset <= 0) next.delete('offset');
      else next.set('offset', String(nextOffset));
    });
  };

  // ── 列（design §4.1 列序：资产 → 类型 → 状态 → 姓名 → 工号 → 提交时间 → 操作） ──
  const columns = useMemo<Array<LegacyColumnDef<MyReviewItem, unknown>>>(
    () => [
      {
        id: 'assetSlug',
        accessorKey: 'assetSlug',
        header: t('review', 'col.asset'),
        meta: { hidable: false },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.assetSlug}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {row.original.assetVersion}
            </span>
          </div>
        ),
      },
      {
        id: 'assetType',
        accessorKey: 'assetType',
        header: t('review', 'col.type'),
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            <TypeIcon type={row.original.assetType} />
            {t('assets', `type.${row.original.assetType}`)}
          </span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: t('review', 'col.status'),
        cell: ({ row }) => (
          <StatusPill
            kind="task"
            status={row.original.status}
            label={t('review', STATUS_KEY[row.original.status])}
          />
        ),
      },
      {
        id: 'submittedByName',
        accessorKey: 'submittedByName',
        header: t('review', 'col.name'),
        cell: ({ row }) => (
          <span>
            {row.original.submittedByName ?? <span className="text-muted-foreground">—</span>}
          </span>
        ),
      },
      {
        id: 'submittedBy',
        accessorKey: 'submittedBy',
        header: t('review', 'col.employeeId'),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.submittedBy}</span>,
      },
      {
        id: 'submittedAt',
        accessorKey: 'submittedAt',
        header: t('review', 'col.submittedAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.submittedAt).toLocaleString()}
          </span>
        ),
      },
    ],
    [t],
  );

  const columnItems = useMemo<ColumnToggleItem[]>(
    () => [
      { key: 'assetSlug', label: t('review', 'col.asset'), hidable: false },
      { key: 'assetType', label: t('review', 'col.type'), hidable: true },
      { key: 'status', label: t('review', 'col.status'), hidable: true },
      { key: 'submittedByName', label: t('review', 'col.name'), hidable: true },
      { key: 'submittedBy', label: t('review', 'col.employeeId'), hidable: true },
      { key: 'submittedAt', label: t('review', 'col.submittedAt'), hidable: true },
      { key: 'actions', label: t('review', 'col.actions'), hidable: false },
    ],
    [t],
  );

  const hiddenCount = ALL_COLUMN_IDS.filter((id) => columnVisibility[id] === false).length;

  // 无筛选且空 ⇒ 页面级两行空态；筛选无结果 ⇒ DataTable 单行文案
  const queueEmpty = !loading && !error && status === undefined && (data?.total ?? 0) === 0;

  return (
    <>
      <PageHeader title={t('admin', 'reviews')} description={t('review', 'subtitle')} />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Label htmlFor="reviews-status-filter" className="text-muted-foreground">
          {t('review', 'filter.label')}
        </Label>
        <Select value={status ?? ALL} onValueChange={onStatusChange}>
          <SelectTrigger id="reviews-status-filter" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('review', 'filter.all')}</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t('review', STATUS_KEY[option])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          <ColumnVisibilityMenu
            items={columnItems}
            value={columnVisibility}
            onChange={setColumnVisibility}
            label={t('market', 'colShow')}
            labels={{ required: t('market', 'colRequired'), reset: t('market', 'colReset') }}
            badgeCount={hiddenCount}
          />
        </div>
      </div>

      {queueEmpty ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle>{t('review', 'empty')}</EmptyTitle>
            <EmptyDescription>{t('review', 'emptyHint')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable<MyReviewItem>
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => String(row.taskId)}
          loading={loading}
          error={error}
          onRetry={() => setRetryTick((n) => n + 1)}
          emptyMessage={t('review', 'empty.filtered')}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          rowActionsLabel={t('review', 'col.actions')}
          rowActionsHeader={t('review', 'col.actions')}
          rowActions={(row) => (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                /* 无障碍名复用既有键（design Q11「组件层固定文案跨组复用」⇒ 零新增键） */
                aria-label={t('submissions', 'action.view')}
                title={t('submissions', 'action.view')}
                onClick={() => navigate(`/reviews/${row.taskId}`)}
              >
                <Eye className="size-4" />
              </Button>
            </div>
          )}
        />
      )}

      {/* 分页：仅 `total > limit` 时渲染（单页不显示「1 / 1」噪音） */}
      {data && data.total > limit ? (
        <Pagination total={data.total} limit={limit} offset={offset} onPageChange={onPageChange} />
      ) : null}
    </>
  );
}
