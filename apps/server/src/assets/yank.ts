/**
 * 版本撤回分发（M3 design §4.1 R9——PUBLISHED → YANKED + latest 重算）。
 * 判定：仅平台治理面（ASSET_ADMIN/SUPER_ADMIN——05 §6.4「撤回已发布版本」行；
 * 非 owner/空间 ADMIN——撤回影响已分发消费者，治理最严面）——路由层判定后收授权输入。
 * skillhub 同构（SkillGovernanceService.yankVersion：3 列留痕 + latest 重算 + 审计
 * YANK_SKILL_VERSION）；AIH 差异：downloadReady 布尔列不需要（状态即标记——YANKED 禁下载
 * 由下载授权五档判定，design §7.2 R13）。
 */
import { and, desc, eq } from 'drizzle-orm';
import type { AuditWriter } from '../audit/audit.js';
import type { Db } from '../db/client.js';
import { asset, assetVersion, type VersionStatus } from '../db/schema/index.js';
import { AssetError, assetErrorCodes } from './errors.js';

/** yank 判定（纯函数——路由层组装：仅平台 ASSET_ADMIN/SUPER_ADMIN 治理面，05 §6.4） */
export function canYank(isPlatformAdmin: boolean, isSuperAdmin: boolean): boolean {
  return isPlatformAdmin || isSuperAdmin;
}

export interface YankVersionInput {
  assetId: number;
  version: { id: number; version: string; status: VersionStatus };
  actorId: string;
  /** 撤回理由（必填——yank_reason_required；skillhub YankRequest 同构） */
  reason: string;
}

/**
 * yank 执行：事务内版本 → YANKED + yanked_at/yanked_by/yank_reason 落位 +
 * latest 指针重算（命中时：剩余 PUBLISHED 按 published_at → created_at → id 取最大，
 * 无则置空——design §4.1 排序同构 skillhub）。
 * 审计 asset.version_yank（detail: {reason, version}——reason 为治理内容可落）。
 */
export async function yankVersion(
  db: Db,
  audit: AuditWriter,
  input: YankVersionInput,
): Promise<{ latestVersionId: number | null }> {
  const { assetId, version, actorId, reason } = input;
  if (!reason.trim()) throw new AssetError(assetErrorCodes.yankReasonRequired);
  if (version.status !== 'PUBLISHED') throw new AssetError(assetErrorCodes.versionNotYankable);

  const latest = await db.transaction(async (tx) => {
    await tx
      .update(assetVersion)
      .set({ status: 'YANKED', yankedAt: new Date(), yankedBy: actorId, yankReason: reason.trim() })
      .where(and(eq(assetVersion.id, version.id), eq(assetVersion.status, 'PUBLISHED')));

    // latest 重算（仅在命中当前指针时——否则不动；skillhub 重算排序同构）
    const [current] = await tx
      .select({ latest: asset.latestVersionId })
      .from(asset)
      .where(eq(asset.id, assetId));
    if (current?.latest !== version.id) return current?.latest ?? null;

    const remaining = await tx
      .select({ id: assetVersion.id })
      .from(assetVersion)
      .where(and(eq(assetVersion.assetId, assetId), eq(assetVersion.status, 'PUBLISHED')))
      .orderBy(desc(assetVersion.publishedAt), desc(assetVersion.createdAt), desc(assetVersion.id))
      .limit(1);
    const nextLatest = remaining[0]?.id ?? null;
    // updatedAt 同步 bump（T12 排序语义——撤回属内容状态更新）
    await tx
      .update(asset)
      .set({ latestVersionId: nextLatest, updatedAt: new Date() })
      .where(eq(asset.id, assetId));
    return nextLatest;
  });

  await audit({
    actorId,
    action: 'asset.version_yank',
    targetType: 'asset',
    targetId: String(assetId),
    detail: { version: version.version, reason: reason.trim() },
  });

  return { latestVersionId: latest };
}
