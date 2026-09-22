import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
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
import { fetchAssetDetail } from '../api/assets.js';
import { ApiError, invalidateCache } from '../api/client.js';
import type { AssetStatus, AssetType, VersionListItem } from '../api/types.js';
import {
  deleteVersion,
  fetchVersionDetail,
  fetchVersionList,
  yankVersion,
} from '../api/versions.js';
import { AssetAdminCard } from '../components/console/AssetAdminCard.js';
import { AssetStat } from '../components/console/asset-stats.js';
import { ConfirmDialog } from '../components/console/ConfirmDialog.js';
import { LabelCard } from '../components/console/LabelCard.js';
import { StatusPill } from '../components/console/StatusPill.js';
import { type DetailTab, DetailTabs } from '../components/market/detail/DetailTabs.js';
import { FilesTab } from '../components/market/detail/FilesTab.js';
import { OverviewTab } from '../components/market/detail/OverviewTab.js';
import { VersionCompare } from '../components/market/detail/VersionCompare.js';
import { formatDate, ownerText } from '../components/market/format.js';
import { StarButton } from '../components/market/StarButton.js';

import { ErrorState } from '../components/ui/ErrorState.js';
import { Skeleton } from '../components/ui/shadcn/skeleton.js';
import { useApi } from '../hooks/useApi.js';
import { useViewer } from '../hooks/useViewer.js';
import { useI18n } from '../i18n/I18nProvider.js';
import { canManage, canYank, isVersionDeletable } from '../lib/asset-permissions.js';

const CENTER_OF: Record<AssetType, string> = { skill: '/skills', mcp: '/mcps', agent: '/agents' };
const CENTER_TITLE_KEY: Record<
  AssetType,
  'centerTitleSkill' | 'centerTitleMcps' | 'centerTitleAgents'
> = {
  skill: 'centerTitleSkill',
  mcp: 'centerTitleMcps',
  agent: 'centerTitleAgents',
};

/** 资产状态 → i18n 键（复用列表页筛选键；先例 = M4b-3 `STATUS_KEY`） */
const STATUS_KEY = {
  ACTIVE: 'filter.status.active',
  HIDDEN: 'filter.status.hidden',
  ARCHIVED: 'filter.status.archived',
} as const satisfies Record<AssetStatus, string>;

/** 版本行内动作的待确认项（删除 / 撤回分发各一形态） */
type PendingVersionAction = { kind: 'delete' | 'yank'; version: VersionListItem };

/**
 * 资产详情页（design §3 v0.7：面包屑 → 头部（名称 + 可见性 pill + 标签行）→
 * 宽版双栏（三 Tab 玻璃卡主列 + 320px 右栏粘性 下载/元信息））。
 * 坐标 = 全局唯一裸 slug（M4-pre R5）。
 * 数据编排 §5.3 两波：波 1 = 详情 ∥ 版本列表（并发）；波 2 = latest 版本详情（依赖波 1
 * latestVersion，天然串行——文件清单/统计）。YANKED latest → 下载禁用 + 友好提示。
 *
 * **M4b-4 T12 改造**（批 design §4.6 · R16–R21）：详情页 = **唯一完整视图 + 全部管理动作**——
 * - 头卡：名称 + `StatusPill` + **[下载 vX.Y.Z]**（主按钮，下载逻辑与规则小字沿用 M4a）· 标签行（只读，公开面）
 * - 右栏：元信息卡（作者 / 更新时间 / 下载 / 收藏 —— **图标一律无色**，`asset-stats` 件）
 *   + **标签卡**（`LabelCard`，按权限显隐）+ **管理卡**（`AssetAdminCard`，按权限显隐）
 * - 主列「版本」Tab：行内动作 **删除**（owner 2 态 / 管理档 4 态）· **撤回分发**（仅管理档，仅 `PUBLISHED` 行）
 *   —— 行**内容**沿用 M4a 既有渲染（v1.9 F35：本批只增行内动作）
 * - **无权限 ⇒ 不渲染**（跨档与状态门一致；用户 2026-09-18 拍板）· 整卡无可见动作 ⇒ 整卡不渲染
 * - 写后收口（§4.4）：删除版本 ⇒ 只重取版本段；yank ⇒ 详情 + 版本段 + `invalidateCache('/api/assets')`
 */
export function AssetDetail() {
  const { slug = '' } = useParams();
  const { t, tErr } = useI18n();
  const viewer = useViewer();
  const navigate = useNavigate();
  const [retryTick, setRetryTick] = useState(0);
  // M4b-4 T12：版本段独立重取刻度（删除版本 ⇒ 只刷版本段，不整页重取）
  const [versionsTick, setVersionsTick] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingVersionAction | null>(null);
  const [busy, setBusy] = useState(false);
  // 🟡3 受控下载（fetch blob → 前端可反馈 429/瞬时错误；成功走 a.download 保存）
  const [dlBusy, setDlBusy] = useState(false);
  const [dlErrorCode, setDlErrorCode] = useState<string | null>(null);

  const detailState = useApi((signal) => fetchAssetDetail(slug, { signal }), [slug, retryTick]);
  const versionsState = useApi(
    (signal) => fetchVersionList(slug, { limit: 100 }, { signal }),
    [slug, retryTick, versionsTick],
  );

  const detail = detailState.data;
  const latestVersion = detail?.latestVersion ?? null;
  // 波 2：latest 版本详情（latestVersion 到位才发；无版本资产 resolve null——不产错误噪音）
  const latestState = useApi(
    (signal) =>
      latestVersion ? fetchVersionDetail(slug, latestVersion, { signal }) : Promise.resolve(null),
    // R2：retryTick 并入——波 2 独立失败时可随页面重试一并重发
    [slug, latestVersion, retryTick],
  );

  const loading = detailState.loading || versionsState.loading;
  // R2：波 2 错误并入全局错态（此前静默——文件/总览误显空清单无诊断线索）
  const error =
    detailState.error ?? versionsState.error ?? (latestVersion ? latestState.error : null) ?? null;

  if (error) {
    return <ErrorState error={error} onRetry={() => setRetryTick((n) => n + 1)} />;
  }
  if (loading || !detail) {
    // 载态骨架（本批 §3.10：官方 `Skeleton` 替手搓居中占位）——头卡 + 正文两块与页面对齐
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[120px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    );
  }

  const owner = ownerText(detail);
  const isYanked = latestState.data?.status === 'YANKED';
  const downloadUrl = latestVersion
    ? `/api/assets/${encodeURIComponent(slug)}/versions/${encodeURIComponent(latestVersion)}/download`
    : null;
  const centerPath = CENTER_OF[detail.type];
  const labelTitle = t('market', CENTER_TITLE_KEY[detail.type]);
  // 权限（单点判定 —— lib/asset-permissions.ts 对服务端真码）
  const manageable = canManage(viewer, detail);
  const yankable = canYank(viewer);

  /** 🟡3 受控下载：fetch blob 让 429/瞬时错误有前端反馈（成功走 a.download 保存） */
  async function handleDownload(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!downloadUrl || isYanked || dlBusy) return;
    setDlBusy(true);
    setDlErrorCode(null);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        let code = `http_${res.status}`;
        try {
          const body = (await res.json()) as { code?: string };
          if (typeof body.code === 'string') code = body.code;
        } catch {
          // 非 JSON 错误体——保留 http_ 前缀码
        }
        setDlErrorCode(code);
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${slug}-v${latestVersion}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      setDlErrorCode('network');
    } finally {
      setDlBusy(false);
    }
  }

  /** 版本行内动作（§4.6）：**无权限 ⇒ 不渲染**（状态门同口径）；仅管理档有 yank（仅 PUBLISHED 行） */
  const renderVersionActions = (version: VersionListItem) => {
    const deletable = manageable && isVersionDeletable(version.status, viewer.role);
    const showYank = yankable && version.status === 'PUBLISHED';
    if (!deletable && !showYank) return null;
    return (
      <>
        {deletable ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setPendingAction({ kind: 'delete', version })}
          >
            {t('assets', 'version.delete')}
          </Button>
        ) : null}
        {showYank ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setPendingAction({ kind: 'yank', version })}
          >
            {t('assets', 'version.yank')}
          </Button>
        ) : null}
      </>
    );
  };

  /** 版本行动作确认后收口（§4.4：局部重取 + 缓存失效；失败也回到服务端真实状态） */
  async function onVersionActionConfirm(reason?: string) {
    const action = pendingAction;
    setPendingAction(null);
    if (!action || busy) return;
    setBusy(true);
    try {
      if (action.kind === 'delete') {
        await deleteVersion(slug, action.version.version);
        toast.success(t('assets', 'toast.versionDeleted'));
      } else {
        await yankVersion(slug, action.version.version, reason ?? '');
        toast.success(t('assets', 'toast.versionYanked'));
        setRetryTick((n) => n + 1); // yank ⇒ latest 投影可能变化 ⇒ 详情 + 波 2 重取
      }
      invalidateCache('/api/assets');
      setVersionsTick((n) => n + 1);
    } catch (err) {
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
      invalidateCache('/api/assets');
      setVersionsTick((n) => n + 1);
      setRetryTick((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  /** tab 面板注入（总览 / 文件 = 波 2 latest 消费；versions = 波 1 版本列表数据源） */
  const renderPane = (tab: DetailTab) => {
    if (tab === 'overview') {
      if (!latestVersion)
        return <p className="py-8 text-center text-[13px] text-muted-foreground">—</p>;
      return (
        <OverviewTab
          type={detail.type}
          slug={slug}
          version={latestVersion}
          // R2：波 2 未就 → null（子组件显加载占位而非误导性空清单）
          files={latestState.data ? latestState.data.files : null}
          manifest={latestState.data?.manifestJson ?? null}
          changelog={latestState.data?.changelog}
        />
      );
    }
    if (tab === 'files') {
      if (!latestVersion)
        return <p className="py-8 text-center text-[13px] text-muted-foreground">—</p>;
      return (
        <FilesTab
          slug={slug}
          version={latestVersion}
          files={latestState.data ? latestState.data.files : null}
        />
      );
    }
    // versions tab：波 1 版本列表数据源（历史 + 对比）；T12 增行内动作槽
    return (
      <VersionCompare
        slug={slug}
        versions={versionsState.data?.items ?? []}
        latestVersion={detail.latestVersion}
        rowActions={renderVersionActions}
      />
    );
  };

  return (
    <div className="flex flex-col">
      {/* 面包屑（本批 §3.12 归位官方 `Breadcrumb` 全族）。形态随官方默认：`text-sm` 字阶 ·
          **图标分隔符**（`ChevronRight`，替原 `/` 字面）· 链接走官方色（`muted-foreground` →
          hover `foreground`）· 当前项 `BreadcrumbPage`（`role="link"` + `aria-current="page"`）——
          与原「`text-xs` + `/` + primary 链接 + `<b>`」为可见差异（design §8 观感项）。
          **层级与链接目标零变更**：首页 → 类型中心 → 当前 slug。 */}
      <Breadcrumb className="mb-3.5">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">{t('market', 'crumbHome')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={centerPath}>{labelTitle}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{slug}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 头卡（T17 换皮：玻璃面 + 光斑 → 白卡 + 极轻阴影，页面级 2xl 圆角，与 hero 同档）。
          M4b-4 T12（§4.6 R20/R21）：两栏 —— 左 = 名称 + 状态徽章；右 = 消费者动作 [下载]（T16 追加 [收藏]）；
          下载规则小字下移一行；标签行（只读 chips，公开面）保持。 */}
      <Card className="mb-4 gap-0 px-7 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-[-0.5px]">
              {detail.latestName ?? detail.slug}
            </h1>
            <StatusPill
              kind="asset"
              status={detail.status}
              label={t('assets', STATUS_KEY[detail.status])}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {downloadUrl && !isYanked ? (
              <a
                className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary bg-[image:var(--gradient-cta)] px-[18px] py-[9px] text-sm font-bold text-primary-foreground no-underline transition-[filter] hover:brightness-[1.07] ${
                  dlBusy ? 'pointer-events-none cursor-progress opacity-70' : ''
                }`}
                href={downloadUrl}
                onClick={(event) => void handleDownload(event)}
                aria-busy={dlBusy}
              >
                {dlBusy
                  ? t('market', 'dlDownloading')
                  : `${t('market', 'dlLatest')} ${latestVersion}`}
              </a>
            ) : (
              <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-muted px-[18px] py-[9px] text-sm font-bold text-muted-foreground opacity-80">
                {t('market', 'dlLatest')} {latestVersion ?? ''}
              </span>
            )}
            {/* T16（R20）：收藏 —— 次级按钮，与下载成对出现在头卡右侧；已收藏 ⇒ 星形填充 */}
            <StarButton slug={slug} starred={detail.starredByMe} count={detail.starCount} />
          </div>
        </div>
        <div className="mt-[9px] text-[11px] leading-[1.7] text-muted-foreground">
          {isYanked ? (
            t('errors', 'asset.version_yanked')
          ) : (
            <>
              {t('market', 'dlSubAnon')}
              <br />
              {t('market', 'dlSubRate')}
            </>
          )}
        </div>
        {dlErrorCode && (
          <p
            className="mt-2 rounded-md bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive"
            role="alert"
          >
            {tErr(dlErrorCode)}
          </p>
        )}
        {(detail.labels?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {detail.labels?.map((label) => (
              <span
                key={label.slug}
                className="inline-flex items-center rounded-full bg-secondary px-3 py-[3px] text-[11px] font-medium text-secondary-foreground"
              >
                {label.displayName}
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-[1fr_320px] items-start gap-4">
        <div className="min-w-0">
          <DetailTabs renderPane={renderPane} />
        </div>
        {/* 右栏（T17 同批换皮：玻璃面 → 白卡；蓝色投影按 §4.4 废弃清单清除）——宽 **320px**（§9 真值）/
            sticky **78px**（= 顶栏 58 + 间距 20），均**写死**不再依赖旧层 `--aside-w`/`--topbar-h`
            （T24 删旧层后旧变量即失效——避免埋雷）。
            M4b-4 T12（§4.6 R17/R18/R19）：下载按钮移到头卡 ⇒ 本栏顺序 = 元信息卡 → 标签卡 → 管理卡 */}
        <aside className="sticky top-[78px] flex flex-col gap-3.5">
          <Card className="gap-0 px-5 py-[18px]">
            <h3 className="mb-3 text-[13px] font-bold">{t('market', 'metaInfo')}</h3>
            <div className="flex items-baseline justify-between gap-3 py-[5px] text-xs">
              <span className="shrink-0 text-muted-foreground">{t('market', 'author')}</span>
              <b className="overflow-hidden text-right font-semibold text-ellipsis whitespace-nowrap">
                {owner || '—'}
              </b>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-[5px] text-xs">
              <span className="shrink-0 text-muted-foreground">{t('market', 'updatedAt')}</span>
              <b className="overflow-hidden text-right font-semibold text-ellipsis whitespace-nowrap">
                {formatDate(detail.updatedAt)}
              </b>
            </div>
            {/* R18/R19/R23：下载 / 收藏数值前置图标，**图标一律无色**（`asset-stats` 件共用） */}
            <div className="flex items-baseline justify-between gap-3 py-[5px] text-xs">
              <span className="shrink-0 text-muted-foreground">{t('market', 'downloads')}</span>
              <b className="overflow-hidden text-right font-semibold text-ellipsis whitespace-nowrap">
                <AssetStat kind="download" count={detail.downloadCount} />
              </b>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-[5px] text-xs">
              <span className="shrink-0 text-muted-foreground">{t('market', 'star')}</span>
              <b className="overflow-hidden text-right font-semibold text-ellipsis whitespace-nowrap">
                <AssetStat kind="star" count={detail.starCount} />
              </b>
            </div>
          </Card>

          {/* 标签卡（R17：独立成卡；整卡无可见动作 ⇒ 不渲染 —— 卡层口径在件内） */}
          <LabelCard
            slug={slug}
            asset={detail}
            labels={detail.labels ?? []}
            viewer={viewer}
            title={t('market', 'labelsTitle')}
            onChanged={() => setRetryTick((n) => n + 1)}
          />

          {/* 管理卡（§4.6：资产状态 / 版本 / 审核[占位] / 危险区；整卡无可见动作 ⇒ 不渲染） */}
          <AssetAdminCard
            slug={slug}
            asset={detail}
            viewer={viewer}
            onChanged={() => {
              invalidateCache('/api/assets');
              setRetryTick((n) => n + 1);
            }}
            onDeleted={() => navigate('/dashboard/assets')}
          />
        </aside>
      </div>

      {/* 版本行内动作的二次确认（§4.4：危险操作统一走 `ConfirmDialog`；本批统一去红 `destructive={false}`）。
          yank 需填原因（服务端 `asset.yank_reason_required` 兜底）。 */}
      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={
          pendingAction?.kind === 'delete'
            ? t('assets', 'confirm.versionTitle', {
                action: t('assets', 'version.delete'),
                version: pendingAction.version.version,
              })
            : t('assets', 'confirm.versionTitle', {
                action: t('assets', 'version.yank'),
                version: pendingAction?.version.version ?? '',
              })
        }
        description={
          pendingAction?.kind === 'yank'
            ? t('assets', 'confirm.desc.yank')
            : t('assets', 'confirm.desc.deleteVersion')
        }
        confirmLabel={t('assets', 'confirm.submit')}
        cancelLabel={t('common', 'cancel')}
        destructive={false}
        reason={pendingAction?.kind === 'yank' ? 'required' : 'none'}
        reasonLabel={t('assets', 'confirm.yankReasonLabel')}
        reasonPlaceholder={t('assets', 'confirm.yankReasonPlaceholder')}
        onConfirm={onVersionActionConfirm}
      />
    </div>
  );
}
