/**
 * 下载 / 收藏**展示**小件（M4b-4 批 design §3.1 件 11 · §2.1d R11/R12/R18/R19/R23）。
 *
 * 消费点（抽屉取消后 = 2 处，v1.9）：
 * 1. 我的资产列表「下载」/「收藏」列（`pages/Assets.tsx`）
 * 2. 资产详情页右栏元信息卡（`pages/AssetDetail.tsx`）
 *
 * 口径（**用户 2026-09-18 拍板**）：
 * - 图标**一律无色**（`text-muted-foreground`）—— 列表数值与元信息卡都不表达收藏态
 * - **收藏态表达不在此件**：星形填充属**交互按钮**（`StarButton`，T16）
 * - 数值 = `compactCount`（千分位紧凑）+ `tabular-nums`（列对齐）
 */
import { Download, Star } from 'lucide-react';
import { compactCount } from '../market/format.js';

const STAT_ICON = { download: Download, star: Star } as const;

export type AssetStatKind = keyof typeof STAT_ICON;

export function AssetStat({ kind, count }: { kind: AssetStatKind; count: number }) {
  const Icon = STAT_ICON[kind];
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground tabular-nums">
      <Icon className="size-3.5" />
      {compactCount(count)}
    </span>
  );
}
