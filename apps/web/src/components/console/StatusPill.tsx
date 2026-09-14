import type { VariantProps } from 'class-variance-authority';
import { Badge, type badgeVariants } from '@/components/ui/shadcn/badge';
import type { AssetStatus } from '../../api/types.js';

/** 官方 `Badge` variant 取值（含本仓在源码新增的 `success`/`warning`——design §3.5） */
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

/**
 * 状态语义映射（**不复制色值**，只映射到官方 `Badge` variant —— 主 design §10.1 映射表）：
 *
 * 资产三态（08 §5.1）：`ACTIVE` = success · `HIDDEN` = warning · `ARCHIVED` = secondary
 * 版本八态（08 §7）：`PUBLISHED` = success · `UPLOADED` / `PENDING_REVIEW` = warning ·
 * `SCAN_FAILED` / `REJECTED` = destructive · `YANKED` = secondary · `DRAFT` / `SCANNING` = secondary（中性）
 *
 * 八态口径 **2026-09-14 用户拍板定死**（主 design §10.1 …以版本头为准，对标 21-skillhub）：
 * `UPLOADED` = warning（skillhub 列表页同档「待处置」）· `YANKED` = secondary 灰
 * （与 skillhub 详情页 `VersionStatusBadge` 及门户侧 `VersionCompare` 实况一致）。
 */
export const ASSET_STATUS_VARIANT: Record<AssetStatus, BadgeVariant> = {
  ACTIVE: 'success',
  HIDDEN: 'warning',
  ARCHIVED: 'secondary',
};

export const VERSION_STATUS_VARIANT = {
  DRAFT: 'secondary',
  SCANNING: 'secondary',
  UPLOADED: 'warning',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  SCAN_FAILED: 'destructive',
  REJECTED: 'destructive',
  YANKED: 'secondary',
} as const satisfies Record<string, BadgeVariant>;

/**
 * 资产/版本状态徽章（design §5.1）：`Badge` variant 由状态映射，文案由调用方传入（i18n 在消费点）。
 * `mono` 透传（版本号/枚举值等需要等宽的场景）。
 */
export function StatusPill({
  status,
  kind = 'asset',
  label,
  mono = false,
}: {
  status: AssetStatus | keyof typeof VERSION_STATUS_VARIANT;
  kind?: 'asset' | 'version';
  /** 展示文案（消费点用 i18n 传入，如「已发布」） */
  label: string;
  mono?: boolean;
}) {
  const variant =
    kind === 'asset'
      ? ASSET_STATUS_VARIANT[status as AssetStatus]
      : VERSION_STATUS_VARIANT[status as keyof typeof VERSION_STATUS_VARIANT];
  return (
    <Badge variant={variant} className={mono ? 'font-mono' : undefined}>
      {label}
    </Badge>
  );
}
