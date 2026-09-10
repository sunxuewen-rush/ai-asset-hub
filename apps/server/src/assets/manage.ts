/**
 * 资产管理判定（05 §6.4 → M4-pre design §2.2 两层判定）：
 *  ① 资源级 `asset.owner_id === viewer.userId`（owner 本人可管自己的资产）
 *  ② 平台级 `role >= ADMIN`（管理档；SUPER_ADMIN=100 天然覆盖）
 * 纯函数——调用方传入已解析的角色档位（`requireAuth` 保证账号 ACTIVE）。
 * M4-pre 变更：删除空间角色轴（原「空间 OWNER/ADMIN 完整管理权」语义消失）。
 */
import { ACCOUNT_ROLE, type AccountRole } from '../db/schema/index.js';

export interface CanManageInput {
  /** asset.owner_id（主要维护人） */
  ownerId: string;
  /** 操作者（requireAuth 后必有） */
  viewerId: string;
  /** 平台角色档位（0 未登录 / 1 用户 / 10 管理 / 100 超管——调用方 `roleOf() ?? GUEST`） */
  viewerRole: AccountRole;
}

export function canManageAsset(input: CanManageInput): boolean {
  if (input.viewerId === input.ownerId) return true;
  return input.viewerRole >= ACCOUNT_ROLE.ADMIN;
}
