/**
 * 工作台 landing `/dashboard`（M4b-4 批 design §4.1 · 批 plan **T6**）。
 *
 * 形态：`PageHeader`（标题 `dashboard.title`；副述 `dashboard.welcome`）+ **三卡栅格**
 * （3 列；`< 1100px` 收敛为 1 列）——
 * | 卡 | 数据源 | CTA → |
 * |----|--------|-------|
 * | 待审核 | `GET /api/reviews?status=PENDING&limit=1` → `total`（**全站队列**） | `/admin/reviews` |
 * | 我的资产 | `GET /api/me/assets?status=ALL&limit=1` → `total`（**我名下全集**，含隐藏/归档） | `/dashboard/assets` |
 * | 最近审计 | `GET /api/audit?limit=5`（5 行 = 时间 + 动作**原文枚举** + 对象；**不含操作人**） | `/admin/audit` |
 *
 * 请求裁剪（Q9 A · U4 · dogfood G2/G3）：
 * - `role ≥ 10` ⇒ **3 请求**；`role < 10` ⇒ **只发「我的资产」1 请求**，**只渲染 1 卡**
 *   （不发必然 403 的请求）；**会话未就绪不发任何请求**（`useViewer().loading` ⇒ 整块骨架，防首帧闪烁 U1/P4）
 * - **每卡独立三态 + 独立重试**（一卡失败不拖累另两卡；`onRetry` 只 bump 该卡的 tick）
 * - **零值照常显示「0」**（0 是有效信息，不做空态替换）；卡级 403 ⇒ **就地 `ErrorState`**（不退化空态）
 *
 * 结构（Q9 D）：本批**保留「整卡可点」但走内容 `<Link>`**（非覆盖层）——
 * 覆盖层会吞掉「重试」按钮的点击（④ 要求独立重试）⇒ 取「内容即链接」形态：正常态整卡可点、
 * 错误态就地可重试、且**零嵌套 `<a>`**（断言 ④）；CTA 是**非 anchor 样式化 `<span>`**（`aria-hidden`）。
 */
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchAudit } from '@/api/audit';
import type { ApiError } from '@/api/client';
import { fetchMyAssets } from '@/api/me';
import { fetchReviewQueue } from '@/api/reviews';
import { PageHeader } from '@/components/console/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card } from '@/components/ui/shadcn/card';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/shadcn/empty';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shadcn/table';
import { useApi } from '@/hooks/useApi';
import { useViewer } from '@/hooks/useViewer';
import { useI18n } from '@/i18n/I18nProvider';

/** 审计卡行数（design §4.1：`limit=5`） */
const AUDIT_ROWS = 5;

export function Dashboard() {
  const { t } = useI18n();
  const viewer = useViewer();
  const location = useLocation();
  const navigate = useNavigate();
  const [myTick, setMyTick] = useState(0);
  const [pendingTick, setPendingTick] = useState(0);
  const [auditTick, setAuditTick] = useState(0);

  // Q17：消费守卫弹回时携带的 `state.notice`（toast 一次 + 立即清 state 防刷新重弹）—— 沿过渡件口径
  useEffect(() => {
    const notice = (location.state as { notice?: string } | null)?.notice;
    if (!notice) return;
    toast.warning(notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  // 会话就绪前不发任何业务请求（loading 期整块骨架）；管理档才发后两卡请求（G2/G3）
  const ready = !viewer.loading;
  const admin = viewer.canManageAll;

  const assetsState = useApi(
    (signal) =>
      ready ? fetchMyAssets({ status: 'ALL', limit: 1 }, { signal }) : Promise.resolve(null),
    [ready, myTick],
  );
  const pendingState = useApi(
    (signal) =>
      ready && admin
        ? fetchReviewQueue({ status: 'PENDING', limit: 1 }, { signal })
        : Promise.resolve(null),
    [ready, admin, pendingTick],
  );
  const auditState = useApi(
    (signal) =>
      ready && admin ? fetchAudit({ limit: AUDIT_ROWS }, { signal }) : Promise.resolve(null),
    [ready, admin, auditTick],
  );

  const header = (
    <PageHeader
      title={t('dashboard', 'title')}
      description={t('dashboard', 'welcome', { name: viewer.displayName ?? '' })}
    />
  );

  if (!ready) {
    return (
      <>
        {header}
        <Skeleton className="h-[168px] rounded-xl" />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-1">
        {/* 待审核（全站队列 total）—— 仅管理档 */}
        {admin ? (
          <MetricCard
            to="/admin/reviews"
            title={t('dashboard', 'card.pending.title')}
            cta={t('dashboard', 'card.pending.cta')}
            state={pendingState}
            onRetry={() => setPendingTick((n) => n + 1)}
            value={pendingState.data?.total}
          />
        ) : null}

        {/* 我的资产（我名下全集 total —— 与列表默认「全部」同源，Q1 = A） */}
        <MetricCard
          to="/dashboard/assets"
          title={t('dashboard', 'myAssets')}
          cta={t('dashboard', 'card.assets.cta')}
          state={assetsState}
          onRetry={() => setMyTick((n) => n + 1)}
          value={assetsState.data?.total}
        />

        {/* 最近审计（5 行 · 时间 + 动作原文枚举 + 对象；**不含操作人**）—— 仅管理档 */}
        {admin ? (
          <AuditCard state={auditState} onRetry={() => setAuditTick((n) => n + 1)} t={t} />
        ) : null}
      </div>
    </>
  );
}

/** 单指标卡（整卡可点 = 内容 `<Link>`；错误态就地可重试） */
function MetricCard({
  to,
  title,
  cta,
  value,
  state,
  onRetry,
}: {
  to: string;
  title: string;
  cta: string;
  value: number | undefined;
  state: { loading: boolean; error: ApiError | null };
  onRetry: () => void;
}) {
  return (
    <Card className="gap-0 transition-colors hover:bg-muted/50">
      {state.error ? (
        <div className="p-5">
          <ErrorState error={state.error} onRetry={onRetry} />
        </div>
      ) : (
        <Link to={to} className="flex h-full flex-col p-5 text-inherit no-underline">
          <h3 className="text-[13px] font-medium text-muted-foreground">{title}</h3>
          {state.loading ? (
            <Skeleton className="mt-3 h-9 w-16" />
          ) : (
            // 零值照常显示「0」（Q9 C）
            <p className="mt-1 text-3xl font-bold tabular-nums">{value ?? 0}</p>
          )}
          <span
            className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-primary"
            aria-hidden="true"
          >
            {cta}
            <ChevronRight className="size-3.5" />
          </span>
        </Link>
      )}
    </Card>
  );
}

/** 最近审计卡（5 行；行内空态复用 `dashboard.empty`，卡仍渲染 —— 条① P3） */
function AuditCard({
  state,
  onRetry,
  t,
}: {
  state: { loading: boolean; error: ApiError | null; data: { items: readonly AuditRow[] } | null };
  onRetry: () => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  const rows = state.data?.items ?? [];
  return (
    <Card className="gap-0 transition-colors hover:bg-muted/50">
      {state.error ? (
        <div className="p-5">
          <ErrorState error={state.error} onRetry={onRetry} />
        </div>
      ) : (
        <Link to="/admin/audit" className="flex h-full flex-col p-5 text-inherit no-underline">
          <h3 className="mb-2 text-[13px] font-medium text-muted-foreground">
            {t('dashboard', 'card.audit.title')}
          </h3>
          {state.loading ? (
            <Skeleton className="h-[104px] w-full" />
          ) : rows.length === 0 ? (
            <Empty className="py-6">
              <EmptyHeader>
                <EmptyDescription>{t('dashboard', 'empty')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-0 text-[11px]">
                    {t('dashboard', 'card.audit.col.time')}
                  </TableHead>
                  <TableHead className="h-8 px-0 text-[11px]">
                    {t('dashboard', 'card.audit.col.action')}
                  </TableHead>
                  <TableHead className="h-8 px-0 text-[11px]">
                    {t('dashboard', 'card.audit.col.target')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="px-0 py-1.5 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    {/* 动作 = 原文枚举（中文映射归 M4b-6，Q9 F） */}
                    <TableCell className="px-0 py-1.5 font-mono text-[11px]">
                      {row.action}
                    </TableCell>
                    <TableCell
                      className="max-w-[120px] truncate px-0 py-1.5 text-[11px] text-muted-foreground"
                      title={`${row.targetType ?? ''} ${row.targetId ?? ''}`.trim()}
                    >
                      {row.targetType ? `${row.targetType} ${row.targetId ?? ''}`.trim() : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <span
            className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-medium text-primary"
            aria-hidden="true"
          >
            {t('dashboard', 'card.audit.viewAll')}
            <ChevronRight className="size-3.5" />
          </span>
        </Link>
      )}
    </Card>
  );
}

/** 审计行（`api/audit.ts` 的 `AuditItem` 消费子集——只读三字段） */
interface AuditRow {
  id: string | number;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}
