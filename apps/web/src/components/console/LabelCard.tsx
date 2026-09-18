/**
 * 标签卡 `标签+-`（M4b-4 批 design §3.1 件 10 · §4.6 R17 · 批 plan T12）。
 *
 * 共用件：资产详情页右栏**独立**标签卡（唯一消费点 —— 原抽屉「标签+-」段随 v1.9 取消）。
 *
 * 口径（逐条对应批 design）：
 * - 已挂 chips 来源 = 资产详情 `labels[]`（**结构体**，T14 已下发 `displayName`/`type`/`parentId` ⇒ 前端零 join）
 * - 候选来源 = `GET /api/labels`（公开面，**恒不含 `PRIVILEGED`** —— §2.1 Q7 ①：超管亦无特权候选）
 * - 挂 / 卸 = `PUT`/`DELETE /api/assets/:slug/labels/:labelSlug`（服务端守卫见 `api/labels.ts` 注释）
 * - **× 的禁用口径**（用户 2026-09-18 拍板）：已挂 `PRIVILEGED` + 非超管 ⇒ **× 禁用 + `title` 说明**
 *   （文案 `label.privileged`）；普通标签 × 一律可点。服务端 `label.access_denied` **仍在** = 双保险
 * - **上限 10**（`06 §1`）：已达上限 ⇒ 添加入口禁用并以 `label.limit` 说明
 * - **整卡无可见动作 ⇒ 整卡不渲染**（§4.6 卡层口径）—— 非 owner 非管理档（含访客）即此情形
 * - 挂/卸**不做二次确认**（不在主 design §9 危险操作清单；可一键复原）
 */
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';
import { attachLabel, detachLabel, fetchLabels } from '@/api/labels';
import type { AssetLabelRef } from '@/api/types';
import { Button } from '@/components/ui/shadcn/button';
import { Card } from '@/components/ui/shadcn/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadcn/popover';
import { useApi } from '@/hooks/useApi';
import { useI18n } from '@/i18n/I18nProvider';
import { canManage, canPrivileged, type PermissionViewer } from '@/lib/asset-permissions';

/** 标签挂载上限（`06 §1`；服务端同判 ⇒ `label.limit_exceeded`） */
const MAX_LABELS = 10;

export function LabelCard({
  slug,
  asset,
  labels,
  viewer,
  title,
  onChanged,
}: {
  slug: string;
  /** 判定 canManage 所需的资产最小形状（owner 本人 ∨ 管理档） */
  asset: { ownerId: string };
  labels: readonly AssetLabelRef[];
  viewer: PermissionViewer;
  /** 卡标题（i18n 由调用方给 —— 详情页属门户面，用 `market` 组键） */
  title: string;
  /** 挂 / 卸成功后的收口（详情重取 + 缓存失效由页面负责，沿 M4b-3 先例） */
  onChanged: () => void;
}) {
  const { t, tErr } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const manageable = canManage(viewer, asset);
  const privileged = canPrivileged(viewer);
  const canAdd = manageable && labels.length < MAX_LABELS;

  const candidatesState = useApi((signal) => fetchLabels({ signal }), []);
  const attached = new Set(labels.map((label) => label.slug));
  const candidates = (candidatesState.data ?? []).filter((label) => !attached.has(label.slug));

  async function mutate(action: () => Promise<void>, okMessage: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      toast.success(okMessage);
      onChanged();
    } catch (err) {
      // 服务端兜底路径：并发/权限变化（如非超管卸 PRIVILEGED ⇒ label.access_denied）也走到这里
      toast.error(tErr(err instanceof ApiError ? err.code : 'network'));
    } finally {
      setBusy(false);
    }
  }

  // 整卡无可见动作 ⇒ 不渲染（§4.6 卡层；访客与「登录非 owner」即此情形）
  if (!manageable) return null;

  return (
    <Card className="gap-0 px-5 py-[18px]">
      <h3 className="mb-3 text-[13px] font-bold">{title}</h3>

      {labels.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">—</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {labels.map((label) => {
            // 特权标签 + 非超管 ⇒ 禁用 ×（用户拍板口径；服务端仍会拒 = 双保险）
            const locked = label.type === 'PRIVILEGED' && !privileged;
            return (
              <span
                key={label.slug}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-[3px] text-[11px] font-medium text-secondary-foreground"
              >
                {label.displayName}
                {locked ? (
                  <span
                    className="inline-flex cursor-not-allowed text-muted-foreground opacity-60"
                    title={t('assets', 'label.privileged')}
                    aria-disabled="true"
                  >
                    <X className="size-3" />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex text-muted-foreground hover:text-foreground"
                    aria-label={`${t('assets', 'label.remove')} ${label.displayName}`}
                    title={`${t('assets', 'label.remove')} ${label.displayName}`}
                    disabled={busy}
                    onClick={() =>
                      void mutate(
                        () => detachLabel(slug, label.slug),
                        t('assets', 'toast.labelDetached'),
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {canAdd ? (
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={busy}>
                <Plus className="size-3.5" />
                {t('assets', 'label.add')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[240px] p-0">
              <Command>
                <CommandInput placeholder={t('assets', 'label.search')} />
                <CommandList>
                  <CommandEmpty>{t('assets', 'label.empty')}</CommandEmpty>
                  <CommandGroup>
                    {candidates.map((candidate) => (
                      <CommandItem
                        key={candidate.slug}
                        value={candidate.slug}
                        onSelect={() =>
                          void mutate(
                            () => attachLabel(slug, candidate.slug),
                            t('assets', 'toast.labelAttached'),
                          )
                        }
                      >
                        {candidate.displayName ?? candidate.slug}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-[11px] text-muted-foreground">{t('assets', 'label.limit')}</span>
        )}

        {/* 特权标签入口（仅超管渲染 —— §4.6 权限矩阵末行）。
            占位说明：候选源本批不可得（`GET /api/labels` 恒不含 PRIVILEGED · Q7 ①）
            ⇒ **禁用占位**，真入口随标签定义批（M4b-6）交付（登记 F53）。 */}
        {privileged ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            title={t('assets', 'label.privileged')}
          >
            {t('assets', 'label.privilegedTitle')}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
