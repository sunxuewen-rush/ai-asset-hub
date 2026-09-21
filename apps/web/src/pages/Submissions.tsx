/**
 * 我的提交 `/dashboard/submissions`（M4b-3 批 design §4.1 列集合 + §4.4.1 组件树；批 plan T6）。
 *
 * 契约（引用不复制）：
 * - 数据源 `GET /api/reviews/mine?status=&limit=&offset=`（M4b-3 T1 起 item 增 `reviewComment` / `assetType`）
 * - 撤回 `POST /api/reviews/:id/withdraw`（仅 `PENDING` 可用；成功 = 204）
 *
 * 关键纪律（design D3/D8/D12 · §4.4.2）：
 * - **「全部」= 不带 `status` 参数** —— 服务端对非法值**静默忽略**（`review/query.ts:parseReviewStatus`）
 *   ⇒ 绝不传 `ALL` / 空串（传了等于没筛，R3）。`ALL` 只是本页 Select 的**前端哨兵值**。
 * - 筛选与分页**URL 状态化**（`?status=&limit=&offset=`；`useSearchParams`）—— 刷新保持、浏览器后退可回。
 * - 操作列**图标化**（[👁 查看] + [↩ 撤回]；撤回**仅 `PENDING` 渲染**）；**不做整行可点**（D3 v1.6）。
 * - 状态徽章走 `StatusPill kind="task"`（T5 落地的 review task 四态映射；`REJECTED` = 蓝→紫渐变实底）。
 * - 撤回确认**去红**（`destructive={false}` ⇒ 确认按钮走 primary 蓝）。
 *
 * 空态两文案（design §4.1「从未提交 / 筛选无结果」两种）：从未提交 = 页面级 `Empty`（`empty.none` +
 * `empty.noneHint` 两行）；筛选无结果 = `DataTable` 的 `emptyMessage`（`empty.filtered`）。
 */
import type { LegacyColumnDef } from '@tanstack/react-table/legacy';
import { Eye, Undo2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, invalidateCache } from '@/api/client';
import {
  fetchMyReviews,
  type MyReviewItem,
  type ReviewStatus,
  withdrawReview,
} from '@/api/reviews';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { PageHeader } from '@/components/console/PageHeader';
import { StatusPill } from '@/components/console/StatusPill';
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

/** 「全部」哨兵：**只存在于前端**，映射为「不带 `status` 参数」（R3） */
const ALL = '__all__';

/** 服务端四态（`08 §6`；与 `VERSION_STATUS_VARIANT` 的版本八态**不同轴**） */
const STATUS_OPTIONS: readonly ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

/** 状态 → i18n 键单点映射（禁在 JSX 里散写三元链；`satisfies` 保证键名与资源字典对齐） */
const STATUS_KEY = {
  PENDING: 'status.pending',
  APPROVED: 'status.approved',
  REJECTED: 'status.rejected',
  WITHDRAWN: 'status.withdrawn',
} as const satisfies Record<ReviewStatus, string>;

/** 服务端分页默认（`http/reviews.ts` `PAGE_SCHEMA.limit` 默认 20） */
const PAGE_LIMIT = 20;

export function Submissions() {
  const { t, tErr } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [retryTick, setRetryTick] = useState(0);
  const [withdrawRow, setWithdrawRow] = useState<MyReviewItem | null>(null);

  // ── URL 状态化（design D8）：单一真值在 URL，组件不另存 state ──────────────
  const rawStatus = searchParams.get('status');
  const status = STATUS_OPTIONS.includes(rawStatus as ReviewStatus)
    ? (rawStatus as ReviewStatus)
    : undefined;
  const offset = Math.max(0, Number(searchParams.get('offset') ?? '') || 0);
  const limit = Number(searchParams.get('limit') ?? '') || PAGE_LIMIT;

  const { data, error, loading } = useApi(
    (signal) => fetchMyReviews({ status, limit, offset }, { signal }),
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
      next.delete('offset'); // 筛选变更 ⇒ 回第一页（旧 offset 在新结果集里无意义）
    });
  };

  const onPageChange = (nextOffset: number) => {
    applyParams((next) => {
      if (nextOffset <= 0) next.delete('offset');
      else next.set('offset', String(nextOffset));
    });
  };

  const onRetry = () => setRetryTick((n) => n + 1);

  // ── 列（design §4.1 列序：资产 → 类型 → 状态 → 提交时间 → 拒绝原因 → 操作） ──
  const columns = useMemo<Array<LegacyColumnDef<MyReviewItem, unknown>>>(
    () => [
      {
        accessorKey: 'assetSlug',
        header: t('submissions', 'col.asset'),
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
        accessorKey: 'assetType',
        header: t('submissions', 'col.type'),
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            <TypeIcon type={row.original.assetType} />
            {t('submissions', `type.${row.original.assetType}`)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('submissions', 'col.status'),
        cell: ({ row }) => (
          <StatusPill
            kind="task"
            status={row.original.status}
            label={t('submissions', STATUS_KEY[row.original.status])}
          />
        ),
      },
      {
        accessorKey: 'submittedAt',
        header: t('submissions', 'col.submittedAt'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.submittedAt).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: 'reviewComment',
        header: t('submissions', 'col.rejectReason'),
        cell: ({ row }) => {
          const comment = row.original.reviewComment;
          // 仅 REJECTED 行有值（D2）；其余显示占位「—」
          if (!comment || row.original.status !== 'REJECTED')
            return <span className="text-muted-foreground">—</span>;
          return (
            <span className="block max-w-[280px] truncate" title={comment}>
              {comment}
            </span>
          );
        },
      },
    ],
    [t],
  );

  const onWithdrawConfirm = async () => {
    const row = withdrawRow;
    setWithdrawRow(null); // 先关弹窗（避免请求期间挂死对话框）
    if (!row) return;
    try {
      await withdrawReview(row.taskId);
      invalidateCache('/api/reviews');
      setRetryTick((n) => n + 1);
      toast.success(t('submissions', 'withdraw.success'));
    } catch (err) {
      // 并发已被裁决（400/404）或网络失败：刷新列表回到服务端真实状态 + 提示
      invalidateCache('/api/reviews');
      setRetryTick((n) => n + 1);
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    }
  };

  // 从未提交（无筛选 + 空）⇒ 页面级两行空态；筛选无结果 ⇒ DataTable 单行文案
  const neverSubmitted = !loading && !error && status === undefined && (data?.total ?? 0) === 0;

  return (
    <>
      <PageHeader
        title={t('dashboard', 'submissions')}
        description={t('submissions', 'subtitle')}
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Label htmlFor="submissions-status-filter" className="text-muted-foreground">
          {t('submissions', 'filter.label')}
        </Label>
        <Select value={status ?? ALL} onValueChange={onStatusChange}>
          <SelectTrigger id="submissions-status-filter" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('submissions', 'filter.all')}</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t('submissions', STATUS_KEY[option])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {neverSubmitted ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle>{t('submissions', 'empty.none')}</EmptyTitle>
            <EmptyDescription>{t('submissions', 'empty.noneHint')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable<MyReviewItem>
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => String(row.taskId)}
          loading={loading}
          error={error}
          onRetry={onRetry}
          emptyMessage={t('submissions', 'empty.filtered')}
          rowActionsLabel={t('submissions', 'col.actions')}
          rowActionsHeader={t('submissions', 'col.actions')}
          rowActions={(row) => (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t('submissions', 'action.view')}
                title={t('submissions', 'action.view')}
                onClick={() => navigate(`/reviews/${row.taskId}`)}
              >
                <Eye className="size-4" />
              </Button>
              {row.status === 'PENDING' ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t('submissions', 'action.withdraw')}
                  title={t('submissions', 'action.withdraw')}
                  onClick={() => setWithdrawRow(row)}
                >
                  <Undo2 className="size-4" />
                </Button>
              ) : null}
            </div>
          )}
        />
      )}

      {/* 分页：**仅 `total > limit` 时渲染**（design §4.4.1 组件树末行；单页不显示「1 / 1」噪音） */}
      {data && data.total > limit ? (
        <Pagination total={data.total} limit={limit} offset={offset} onPageChange={onPageChange} />
      ) : null}

      <ConfirmDialog
        open={withdrawRow !== null}
        onOpenChange={(open) => {
          if (!open) setWithdrawRow(null);
        }}
        title={t('submissions', 'withdraw.title')}
        description={t('submissions', 'withdraw.desc')}
        confirmLabel={t('submissions', 'withdraw.confirm')}
        cancelLabel={t('common', 'cancel')}
        destructive={false}
        onConfirm={onWithdrawConfirm}
      />
    </>
  );
}
