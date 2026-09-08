/**
 * 资产管理判定（M2 design §7；05 §6.4：asset:manage = 空间 ADMIN 以上，或 owner 本人）。
 * 业务层组合 helper——owner 判定依赖资源上下文（asset.owner_id），不进空间角色静态矩阵
 * （milestone-code-batch-scoring Pitfall 3）。调用方负责：requireAuth（账号 ACTIVE）+
 * 空间非 ACTIVE 拒写门（FROZEN 只读 / ARCHIVED 归档——05 §6.3 判定链第 6 步）。
 */
import type { NamespaceRole } from '../db/schema/index.js';

export interface CanManageInput {
  /** asset.owner_id（主要维护人） */
  ownerId: string;
  /** 操作者（requireAuth 后必有） */
  viewerId: string;
  /** viewer 在空间的角色（null = 非成员）；空间 OWNER/ADMIN 对空间内资产完整管理权（05 §6.5） */
  namespaceRole: NamespaceRole | null;
  /** SUPER_ADMIN 全权（05 §6.3 第 4 步短路——本函数不含账号状态检查，由 requireAuth 保证） */
  isSuperAdmin: boolean;
}

export function canManageAsset(input: CanManageInput): boolean {
  if (input.isSuperAdmin) return true;
  if (input.viewerId === input.ownerId) return true;
  return input.namespaceRole === 'OWNER' || input.namespaceRole === 'ADMIN';
}
