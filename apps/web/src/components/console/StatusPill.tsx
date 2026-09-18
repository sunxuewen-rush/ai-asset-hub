import type { VariantProps } from 'class-variance-authority';
import { Badge, type badgeVariants } from '@/components/ui/shadcn/badge';
import type { ReviewStatus } from '../../api/reviews.js';
import type { AssetStatus } from '../../api/types.js';

/** 官方 `Badge` variant 取值（含本仓在源码新增的 `success`/`warning`/`rejected`——design §3.5） */
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

/**
 * 状态语义映射（**不复制色值**，只映射到官方 `Badge` variant —— 主 design §10.1 映射表）：
 *
 * 资产三态（08 §5.1）：`ACTIVE` = success · `HIDDEN` = warning · `ARCHIVED` = secondary
 * 版本八态（08 §7）：`PUBLISHED` = success · `UPLOADED` / `PENDING_REVIEW` = warning ·
 * `SCAN_FAILED` / `REJECTED` = destructive · `YANKED` = secondary · `DRAFT` / `SCANNING` = secondary（中性）
 *
 * 八态口径 **2026-09-14 用户拍板定死**（主 design §10.1 …以版本头为准，对标 skillhub）：
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
 * review task 四态（批 design `2026-09-16-m4b3` D7c/D12 · §4.4 表格 · M4b-3 v1.14）：
 * `PENDING` = warning「待审核」· `APPROVED` = success「已通过」·
 * **`REJECTED` = 实底蓝→紫渐变 + 白字**「已驳回」（渐变 token = `--gradient-rejected`（`aih-theme.css` C 层）
 * ⇒ 经 `badge` 的 `rejected` variant 消费；**去红**，与「已通过」实底绿 + 白字**同构**）·
 * `WITHDRAWN` = secondary「已撤回」（用户 2026-09-16 定：保持灰）。
 *
 * ⚠️ 与版本八态（上表）**不同轴**：本表的 `REJECTED` 是 review task「已驳回」（蓝紫渐变），
 * 版本族的 `REJECTED`（扫描/版本被拒）**仍为 `destructive`** —— 版本族口径本批不动。
 * 状态类型源 = 服务端 / `08 §6` 同轴的四态枚举（web 侧 `api/reviews.ts` 的 `ReviewStatus`）。
 * `M4b-5` 审核面同样消费本映射。
 */
export const TASK_STATUS_VARIANT: Record<ReviewStatus, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'rejected',
  WITHDRAWN: 'secondary',
};

/**
 * 资产 / 版本 / review task 状态徽章（design §5.1）：`Badge` variant 由状态映射，文案由调用方传入
 * （i18n 在消费点）。`kind` 缺省 = `'asset'`。
 * `mono` 透传（版本号/枚举值等需要等宽的场景）。
 */
export function StatusPill({
  status,
  kind = 'asset',
  label,
  mono = false,
}: {
  status: AssetStatus | keyof typeof VERSION_STATUS_VARIANT | keyof typeof TASK_STATUS_VARIANT;
  kind?: 'asset' | 'version' | 'task';
  /** 展示文案（消费点用 i18n 传入，如「已发布」） */
  label: string;
  mono?: boolean;
}) {
  const variant =
    kind === 'task'
      ? TASK_STATUS_VARIANT[status as ReviewStatus]
      : kind === 'asset'
        ? ASSET_STATUS_VARIANT[status as AssetStatus]
        : VERSION_STATUS_VARIANT[status as keyof typeof VERSION_STATUS_VARIANT];
  return (
    <Badge variant={variant} className={mono ? 'font-mono' : undefined}>
      {label}
    </Badge>
  );
}
