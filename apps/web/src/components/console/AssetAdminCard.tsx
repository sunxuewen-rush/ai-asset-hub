/**
 * 资产详情页**管理卡**（M4b-4 批 design §4.6 · 批 plan T12）。
 *
 * 定位：管理动作**全部**落资产详情页（用户 2026-09-18 拍板）——本卡是「唯一完整视图」的治理面。
 *
 * 四组与权限（**逐条对齐服务端真码守卫**，判定经 `lib/asset-permissions.ts` 单点）：
 * | 组 | 动作 | 门槛 |
 * |----|------|------|
 * | 资产状态 | 隐藏 / 归档 / 恢复（**3×2 矩阵**：每态给出另外两态，Q6 = C） | owner ∨ `role ≥ ADMIN` |
 * | 版本 | 发布新版本（**占位** → M4b-8） | 同上 |
 * | 审核 | 通过 / 驳回（**占位** → M4b-5，用户标注「形态待讨论」） | `role ≥ ADMIN` |
 * | 危险区 | 删除资产 | owner ∨ `role ≥ ADMIN` |
 *
 * 显隐口径（用户 2026-09-18 拍板）：**无权限 ⇒ 不渲染**（跨档与状态门一致）；
 * **整卡无任何可见动作 ⇒ 整卡不渲染**（§4.6 卡层）⇒ 访客 / 登录非 owner 不出现本卡。
 *
 * 写后收口（§4.4 / §4.6）：状态治理成功 ⇒ `onChanged()`（页面重取详情 + `invalidateCache`）；
 * 删除资产成功 ⇒ `onDeleted()`（页面离开详情页 —— 资产已不存在）。
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteAsset, patchAssetStatus } from '@/api/assets';
import { ApiError, invalidateCache } from '@/api/client';
import type { AssetStatus } from '@/api/types';
import { Button } from '@/components/ui/shadcn/button';
import { Card } from '@/components/ui/shadcn/card';
import { Separator } from '@/components/ui/shadcn/separator';
import { useI18n } from '@/i18n/I18nProvider';
import { canManage, type PermissionViewer } from '@/lib/asset-permissions';
import { ConfirmDialog } from './ConfirmDialog.js';

/** 3×2 状态矩阵（Q6 = C：每态给出另外两态各一个按钮 —— 与服务端能力 1:1） */
const STATUS_ACTIONS: Record<AssetStatus, readonly AssetStatus[]> = {
  ACTIVE: ['HIDDEN', 'ARCHIVED'],
  HIDDEN: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE', 'HIDDEN'],
};

/** 目标状态 → 动作键（`ACTIVE` = 恢复） */
const STATUS_ACTION_KEY = {
  ACTIVE: 'action.restore',
  HIDDEN: 'action.hide',
  ARCHIVED: 'action.archive',
} as const satisfies Record<AssetStatus, string>;

/** 目标状态 → 确认框后果说明键 */
const STATUS_DESC_KEY = {
  ACTIVE: 'confirm.desc.restore',
  HIDDEN: 'confirm.desc.hide',
  ARCHIVED: 'confirm.desc.archive',
} as const satisfies Record<AssetStatus, string>;

type Pending = { kind: 'status'; to: AssetStatus } | { kind: 'delete' };

export function AssetAdminCard({
  slug,
  asset,
  viewer,
  onChanged,
  onDeleted,
}: {
  slug: string;
  /** 判定所需的最小形状（owner 本人 ∨ 管理档） */
  asset: { ownerId: string; status: AssetStatus };
  viewer: PermissionViewer & { canManageAll: boolean };
  /** 状态治理成功 ⇒ 页面重取详情 + 缓存失效 */
  onChanged: () => void;
  /** 删除资产成功 ⇒ 页面离开详情页 */
  onDeleted: () => void;
}) {
  const { t, tErr } = useI18n();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const manageable = canManage(viewer, asset);
  const reviewable = viewer.canManageAll;
  // 可见性 = 任一动作组可见（整卡无可见动作 ⇒ 不渲染 —— §4.6 卡层口径）
  const visible = manageable || reviewable;

  async function confirm(reason?: string) {
    void reason; // 本卡无 requireReason 变体（yank 在版本行内动作）
    const action = pending;
    setPending(null);
    if (!action || busy) return;
    setBusy(true);
    try {
      if (action.kind === 'status') {
        await patchAssetStatus(slug, action.to);
        toast.success(t('assets', 'toast.statusUpdated'));
        onChanged();
      } else {
        await deleteAsset(slug);
        toast.success(t('assets', 'toast.assetDeleted'));
        invalidateCache('/api/assets');
        onDeleted();
      }
    } catch (err) {
      // 服务端兜底：并发/状态变化（如存在 PUBLISHED ⇒ asset.has_published）与网络失败
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
      onChanged(); // 回到服务端真实状态
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  const confirmTitle =
    pending?.kind === 'status'
      ? t('assets', 'confirm.assetTitle', {
          action: t('assets', STATUS_ACTION_KEY[pending.to]),
          slug,
        })
      : t('assets', 'confirm.assetTitle', { action: t('assets', 'danger.delete'), slug });
  const confirmDesc =
    pending?.kind === 'status'
      ? t('assets', STATUS_DESC_KEY[pending.to])
      : t('assets', 'confirm.desc.deleteAsset');

  return (
    <Card className="gap-0 px-5 py-[18px]">
      <h3 className="mb-3 text-[13px] font-bold">{t('assets', 'admin.title')}</h3>

      {/* ① 资产状态（owner ∨ 管理档）—— 3×2 矩阵 */}
      {manageable ? (
        <div className="mb-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            {t('assets', 'admin.statusGroup')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ACTIONS[asset.status].map((to) => (
              <Button
                key={to}
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setPending({ kind: 'status', to })}
              >
                {t('assets', STATUS_ACTION_KEY[to])}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ② 版本：发布新版本 = 占位（真入口归 M4b-8 发布批；§4.6 占位登记）。
          ⚠️ 版本级「撤回分发」**不在本组**：yank 需具体版本对象 ⇒ 落在主列「版本」Tab 的行内动作
          （盲按钮 = 无对象死件；实现期判定，登记 F56）。 */}
      {manageable ? (
        <div className="mb-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            {t('assets', 'admin.versionGroup')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" disabled>
              {t('assets', 'admin.publishNewVersion')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ③ 审核：占位（归 M4b-5；用户标注「形态待讨论」） */}
      {reviewable ? (
        <div className="mb-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            {t('assets', 'admin.reviewGroup')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="outline" disabled>
              {t('review', 'approve')}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled>
              {t('review', 'reject')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ④ 危险区（owner ∨ 管理档） */}
      {manageable ? (
        <>
          <Separator className="my-3" />
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            {t('assets', 'admin.dangerGroup')}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setPending({ kind: 'delete' })}
          >
            {t('assets', 'danger.delete')}
          </Button>
        </>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel={t('assets', 'confirm.submit')}
        cancelLabel={t('common', 'cancel')}
        destructive={false}
        onConfirm={confirm}
      />
    </Card>
  );
}
