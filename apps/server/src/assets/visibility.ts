/**
 * 资产可见性判定（M2 design §3/§7 读面；08 §5.1 visibility 语义落地）。
 * 纯函数——调用方（http 层）查得 viewer 身份与超管标记后传入。
 *
 * 语义（08 §5.1 → **M4-pre 过渡态**）：
 * - PUBLIC：全站可见（含匿名，默认）
 * - NAMESPACE_ONLY / PRIVATE：**退化为 owner-only**——空间成员面随 M4-pre 消失
 *   （原「空间成员可见」「空间 ADMIN+ 完整管理权」语义不再成立）；
 *   `visibility` 列与三态取值本身留待 S3（M4-pre T10）整体删除（届时只保留 PUBLIC）。
 * - asset.status 非 ACTIVE：仅 SUPER_ADMIN 可见（`viewer.isSuperAdmin` 短路；隐藏/归档对外不可见）
 */
import type { AssetStatus, Visibility } from '../db/schema/index.js';

export interface VisibilityInput {
  /** asset.status（ACTIVE 之外仅超管） */
  assetStatus: AssetStatus | string;
  /** asset.visibility（08 §5.1 三态；M4-pre 后仅 PUBLIC 语义有效） */
  visibility: Visibility | string;
  /** asset.owner_id（主要维护人） */
  ownerId: string;
  /** null = 匿名（PUBLIC 匿名可读；非 PUBLIC 需登录身份且须为 owner） */
  viewerId: string | null;
  /** SUPER_ADMIN 全可见（05 §6.3 短路） */
  isSuperAdmin: boolean;
}

export function canViewAsset(input: VisibilityInput): boolean {
  const { assetStatus, visibility, ownerId, viewerId, isSuperAdmin } = input;

  // SUPER_ADMIN 短路（05 §6.3：全权）
  if (isSuperAdmin) return true;

  // 资产隐藏/归档：仅超管（M2 design §7b 治理对称——普通用户 404 不泄露存在性）
  if (assetStatus !== 'ACTIVE') return false;

  switch (visibility) {
    case 'PUBLIC':
      return true;
    case 'NAMESPACE_ONLY':
    case 'PRIVATE':
      return viewerId !== null && viewerId === ownerId;
    default:
      return false;
  }
}
