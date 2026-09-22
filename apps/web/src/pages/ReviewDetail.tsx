/**
 * 共享详情 `/reviews/:id`（批 design §4.2 版式 + §4.6 三动作 + §4.10 变更对比卡 · 批 plan T8）。
 *
 * 数据源：`GET /api/reviews/:id`（**授权 = 管理档 ∨ 提交人** —— 服务端 `http/reviews.ts`）
 *
 * 版式（§4.2）：① 面包屑（**按「谁的面」分叉**，用 `submittedBy` 而非角色）→ ② `PageHeader` → ③ 两栏
 * `grid`（`<1100px` ⇒ 单列堆叠）：
 * - **主列三段竖排（序即编号）**：① 分型 manifest 卡（§4.3）② **变更对比卡**（§4.10）③ 文件清单（§4.5）
 * - **右栏**：task 元信息卡（§4.2）+ 动作卡（§4.6）
 *
 * 关键判据（**单点，禁散写**）：
 * - 预览可用性 = `versionStatus`（§4.4 判定表）；不可预览 ⇒ 文件树仍渲染（结构可审）但**不渲染预览动作** + 顶部说明行
 * - 变更对比 base = `latestVersion`（当前已发布版本）· head = 待审版本；
 *   `latestVersion === null` ⇒ **整卡不渲染**（首版审核无可比对象）· 两者相同 ⇒ **卡内空态**（`detail.compareEmpty`）
 * - 三动作可用性 = `lib/review-permissions.ts`（**R2 后无自审分支**）
 * - 确认形态（Q8 三态）：通过 = `reason="optional"` · 驳回 = `reason="required"` · 撤回 = `reason="none"`
 */
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError, invalidateCache } from '@/api/client';
import { fetchCompare } from '@/api/compare';
import {
  approveReview,
  fetchReviewDetail,
  type ReviewDetailItem,
  rejectReview,
  withdrawReview,
} from '@/api/reviews';
import type { VersionFileEntry } from '@/api/types';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { PageHeader } from '@/components/console/PageHeader';
import { ManifestCard } from '@/components/console/reviews/ManifestCard';
import { ReviewMetaCard } from '@/components/console/reviews/ReviewMetaCard';
import { DiffWorkspace } from '@/components/ui/DiffWorkspace';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilePreviewDialog } from '@/components/ui/FilePreviewDialog';
import { FileTree } from '@/components/ui/FileTree';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/shadcn/breadcrumb';
import { Button } from '@/components/ui/shadcn/button';
import { Card } from '@/components/ui/shadcn/card';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import { useApi } from '@/hooks/useApi';
import { useViewer } from '@/hooks/useViewer';
import { useI18n } from '@/i18n/I18nProvider';
import { reviewActionAvailability } from '@/lib/review-permissions';

/** §4.4 判定表：可预览的 `versionStatus` 集合（**单点** —— 页面不另写规则） */
const PREVIEWABLE: readonly string[] = ['PUBLISHED', 'UPLOADED', 'PENDING_REVIEW'];

type DialogKind = 'approve' | 'reject' | 'withdraw';

export function ReviewDetail() {
  const { t, tErr } = useI18n();
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const navigate = useNavigate();
  const viewer = useViewer();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [preview, setPreview] = useState<VersionFileEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const { data, error, loading } = useApi<ReviewDetailItem>(
    (signal) => fetchReviewDetail(taskId, { signal }),
    [taskId, retryTick],
  );

  const slug = data?.assetSlug ?? null;
  const head = data?.assetVersion ?? null;
  const base = data?.latestVersion ?? null;
  const sameVersion = base !== null && base === head;
  /** 有可比对象且非同一版本 ⇒ 才请求 compare（首版 / 同版本重审 ⇒ 不请求） */
  const comparable = base !== null && !sameVersion && slug !== null && head !== null;

  const compare = useApi(
    (signal) =>
      comparable && slug && base && head
        ? fetchCompare(slug, base, head, { signal })
        : Promise.resolve(null),
    [comparable, slug, base, head],
  );

  const isMine = data !== null && viewer.userId !== null && data.submittedBy === viewer.userId;
  /** 「谁的面」分叉：我的提交 ⇒ 回我的提交；否则回审核管理（管理档查自己的面也回「我的提交」） */
  const backTo = isMine ? '/dashboard/submissions' : '/admin/reviews';
  const backLabel = isMine ? t('dashboard', 'submissions') : t('admin', 'reviews');

  const previewable = data !== null && PREVIEWABLE.includes(data.versionStatus);
  const actions = data === null ? null : reviewActionAvailability(data, viewer);

  const run = useCallback(
    async (kind: DialogKind, reason?: string) => {
      const detail = data;
      setDialog(null);
      if (detail === null || busy) return;
      setBusy(true);
      try {
        if (kind === 'approve') await approveReview(detail.taskId, reason);
        else if (kind === 'reject') await rejectReview(detail.taskId, reason ?? '');
        else await withdrawReview(detail.taskId);
        invalidateCache('/api/reviews');
        toast.success(
          t(
            'review',
            kind === 'approve'
              ? 'toast.approved'
              : kind === 'reject'
                ? 'toast.rejected'
                : 'toast.withdrawn',
            { version: detail.assetVersion },
          ),
        );
        navigate(backTo); // 成功 ⇒ 跳回来源（§4.6）
      } catch (err) {
        // 并发已裁决 / 网络失败：刷新详情回到服务端真实状态 + 提示
        invalidateCache('/api/reviews');
        setRetryTick((n) => n + 1);
        toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
      } finally {
        setBusy(false);
      }
    },
    [busy, backTo, data, navigate, t, tErr],
  );

  const files = data?.files ?? [];

  return (
    <>
      {/* ① 面包屑（载态给骨架 —— 分叉判据依赖 `submittedBy`，未载时不可猜） */}
      {loading || data === null ? (
        <Skeleton className="mb-3.5 h-4 w-[220px]" />
      ) : (
        <Breadcrumb className="mb-3.5">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t('navigation', 'home')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={backTo}>{backLabel}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>#{data.taskId}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* ② 页头：标题 = 具体记录（坐标）· 描述 = 类型名纯文本（P1：不放图标）· 动作归右栏 */}
      <PageHeader
        title={data === null ? t('review', 'title') : `${data.assetSlug} · v${data.assetVersion}`}
        description={data === null ? undefined : t('assets', `type.${data.assetType}`)}
      />

      {/* 错误态：404 ⇒ ErrorState + 重试；403 ⇒ ErrorState（无权查看） */}
      {error !== null && data === null ? (
        <ErrorState
          error={error}
          onRetry={error.code === 'review.not_found' ? () => setRetryTick((n) => n + 1) : undefined}
        />
      ) : null}

      {/* 载态骨架（页头已给；此处两栏骨架） */}
      {loading && data === null ? (
        <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[1fr_320px]">
          <Skeleton className="h-[280px] w-full" />
          <Skeleton className="h-[180px] w-full" />
        </div>
      ) : null}

      {data !== null ? (
        <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[1fr_320px]">
          {/* ── 主列（三段竖排 · 序即编号）── */}
          <div className="flex min-w-0 flex-col gap-4">
            {/* 1. 分型 manifest 卡（定稿条件 ② 载体） */}
            <ManifestCard
              type={data.assetType}
              version={data.assetVersion}
              manifest={data.manifestJson}
              files={files}
            />

            {/* 2. 变更对比卡（§4.10 —— base = 已发布版本 / head = 待审版本）
                · `latestVersion === null` ⇒ 整卡不渲染（首版审核无可比对象）
                · 同版本重审 ⇒ 卡内空态（不请求 compare）
                · 请求失败（授权夹缝 B1 / 竞态）⇒ 卡内内联提示（不整页报错） */}
            {base === null ? null : (
              <Card className="gap-0 px-5 py-[18px]">
                <h3 className="mb-3 text-[13px] font-bold">{t('review', 'detail.compareTitle')}</h3>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">v{base}</span> →{' '}
                  <span className="font-mono">v{head}</span>
                </p>
                {sameVersion ? (
                  <p className="text-[13px] text-muted-foreground">
                    {t('review', 'detail.compareEmpty')}
                  </p>
                ) : compare.loading ? (
                  <Skeleton className="h-[120px] w-full" />
                ) : compare.error !== null ? (
                  <p className="text-[13px] text-muted-foreground">{t('review', 'diff.failed')}</p>
                ) : (compare.data?.files.length ?? 0) === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    {t('review', 'detail.compareEmpty')}
                  </p>
                ) : (
                  <DiffWorkspace files={compare.data?.files ?? []} />
                )}
              </Card>
            )}

            {/* 3. 文件清单（§4.5：`FileTree` + `FilePreviewDialog` 自组合 + 降级）
                不可预览 ⇒ **不渲染预览动作**（`FileTree` 不传 `onOpenFile` ⇒ 纯结构态）+ 顶部说明行 */}
            <Card className="gap-0 px-5 py-[18px]">
              <h3 className="mb-3 text-[13px] font-bold">{t('review', 'detail.files')}</h3>
              {!previewable ? (
                <p className="mb-2.5 text-[11px] text-muted-foreground">
                  {data.versionStatus === 'YANKED'
                    ? t('review', 'preview.yanked')
                    : t('review', 'preview.unavailable')}
                </p>
              ) : null}
              {files.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">{t('common', 'empty')}</p>
              ) : (
                <FileTree
                  files={files}
                  onOpenFile={previewable ? (file) => setPreview(file) : undefined}
                />
              )}
            </Card>
          </div>

          {/* ── 右栏（task 元信息卡 + 动作卡）── */}
          <aside className="flex flex-col gap-3.5 min-[1100px]:sticky min-[1100px]:top-[78px]">
            <ReviewMetaCard detail={data} viewerId={viewer.userId} />

            <Card className="gap-0 px-5 py-[18px]">
              <h3 className="mb-3 text-[13px] font-bold">{t('review', 'col.actions')}</h3>
              {actions?.processed ? (
                <p className="text-[13px] text-muted-foreground">
                  {t('review', 'action.processed')}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {actions?.approve || actions?.reject ? (
                    <div className="flex items-center gap-1.5">
                      {actions.approve ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => setDialog('approve')}
                        >
                          {t('review', 'approve')}
                        </Button>
                      ) : null}
                      {actions.reject ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setDialog('reject')}
                        >
                          {t('review', 'reject')}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {actions?.adminOnlyHint ? (
                    <p className="text-[11px] text-muted-foreground">{t('review', 'adminOnly')}</p>
                  ) : null}
                  {actions?.withdraw ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setDialog('withdraw')}
                    >
                      {t('review', 'withdraw')}
                    </Button>
                  ) : null}
                </div>
              )}
            </Card>
          </aside>
        </div>
      ) : null}

      {/* 预览弹层（仅可预览时可达） */}
      {preview && data !== null ? (
        <FilePreviewDialog
          file={preview}
          slug={data.assetSlug}
          version={data.assetVersion}
          onClose={() => setPreview(null)}
        />
      ) : null}

      {/* 确认弹窗（Q8 三态：通过 optional · 驳回 required · 撤回 none） */}
      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={t('review', 'confirm.approveTitle')}
        description={t('review', 'confirm.approveDesc')}
        confirmLabel={t('review', 'confirm.approveOk')}
        cancelLabel={t('common', 'cancel')}
        destructive={false}
        reason="optional"
        reasonLabel={t('review', 'reason')}
        reasonPlaceholder={t('review', 'reason.placeholder')}
        onConfirm={(reason) => void run('approve', reason)}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={t('review', 'confirm.rejectTitle')}
        description={t('review', 'confirm.rejectDesc')}
        confirmLabel={t('review', 'confirm.rejectOk')}
        cancelLabel={t('common', 'cancel')}
        destructive={false}
        reason="required"
        reasonLabel={t('review', 'reason')}
        reasonPlaceholder={t('review', 'reason.placeholder')}
        reasonHint={t('review', 'reason.hint')}
        onConfirm={(reason) => void run('reject', reason)}
      />
      <ConfirmDialog
        open={dialog === 'withdraw'}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={t('review', 'confirm.withdrawTitle')}
        description={t('review', 'confirm.withdrawDesc')}
        confirmLabel={t('review', 'confirm.withdrawOk')}
        cancelLabel={t('common', 'cancel')}
        destructive={false}
        reason="none"
        onConfirm={() => void run('withdraw')}
      />
    </>
  );
}
