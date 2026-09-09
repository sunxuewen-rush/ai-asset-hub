/**
 * 资产可见性判定（M2 design §3/§7 读面；08 §5.1 visibility 语义落地）。
 * 纯函数——调用方（http 层）负责查得 viewer 的 namespace 角色与超管标记后传入。
 *
 * 语义（08 §5.1 + 05 §6.2/§6.4）：
 * - PUBLIC：全站可见（含匿名，默认）
 * - NAMESPACE_ONLY：空间成员可见
 * - PRIVATE：asset owner 或空间 ADMIN+（OWNER/ADMIN——05 §6.5 主轴：空间管理面
 *   对空间内资产完整管理权，不依赖 asset owner）
 * - asset.status HIDDEN/ARCHIVED：仅 SUPER_ADMIN 可见（隐藏/归档对外不可见）
 * - namespace.status ARCHIVED：空间对外关闭——资产仅成员/超管可读
 */
import type {
  AssetStatus,
  NamespaceRole,
  NamespaceStatus,
  Visibility,
} from '../db/schema/index.js';

export interface VisibilityInput {
  /** namespace.status（空间归档 → 对外关闭） */
  nsStatus: NamespaceStatus | string;
  /** asset.status（ACTIVE 之外仅超管） */
  assetStatus: AssetStatus | string;
  /** asset.visibility（08 §5.1 三态） */
  visibility: Visibility | string;
  /** asset.owner_id（主要维护人） */
  ownerId: string;
  /** null = 匿名（PUBLIC 匿名可读；NAMESPACE_ONLY/PRIVATE 需登录身份） */
  viewerId: string | null;
  /** viewer 在空间的角色（null = 非成员）；空间 OWNER 亦为管理面——复用 schema NamespaceRole */
  namespaceRole: NamespaceRole | null;
  /** SUPER_ADMIN 全可见（05 §6.3 短路） */
  isSuperAdmin: boolean;
}

export function canViewAsset(input: VisibilityInput): boolean {
  const { nsStatus, assetStatus, visibility, ownerId, viewerId, namespaceRole, isSuperAdmin } =
    input;

  // SUPER_ADMIN 短路（05 §6.3：全权）
  if (isSuperAdmin) return true;

  // 空间归档：对外不可见（05 §6.2）——空间成员仍可读（管理面进入同构）
  if (nsStatus === 'ARCHIVED' && namespaceRole === null) return false;

  // 资产隐藏/归档：仅超管（M2 design §7b 治理对称——普通用户 404 不泄露存在性）
  if (assetStatus !== 'ACTIVE') return false;

  switch (visibility) {
    case 'PUBLIC':
      return true;
    case 'NAMESPACE_ONLY':
      return namespaceRole !== null;
    case 'PRIVATE': {
      if (viewerId === null) return false;
      if (viewerId === ownerId) return true;
      // 空间管理面（OWNER/ADMIN）完整管理权（05 §6.5 主轴）
      return namespaceRole === 'OWNER' || namespaceRole === 'ADMIN';
    }
    default:
      return false;
  }
}
