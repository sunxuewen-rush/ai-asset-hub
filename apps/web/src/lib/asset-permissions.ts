/**
 * 前端权限判定单点（M4b-4 批 design §4.6 权限矩阵 · 批 plan T12）。
 *
 * 纪律：**逐条对齐服务端真码守卫**，判定只此一处——页面/组件不得散写
 * `ownerId === userId`、`role >= 10` 之类表达式（防「前端比服务端宽/严」的隐形规则）。
 *
 * | 判定 | 服务端真源 | 语义 |
 * |------|-----------|------|
 * | `canManage` | `assets/manage.ts:19-20` `canManageAsset` | owner 本人 ∨ `role >= ADMIN` |
 * | `canYank` | `http/assets.ts:698-701`（`canYank(role>=ADMIN, role>=SUPER)`） | 仅 `role >= ADMIN`（**owner 不可**） |
 * | `canPrivileged` | `labels/service.ts:516,570`（PRIVILEGED 短路） | 仅 `role >= SUPER_ADMIN` |
 * | `deletableStatuses` | `http/assets.ts:591-601` 状态门分治 | owner/上传者 2 态 · 管理档 4 态 |
 *
 * 「提示性守卫」声明（沿批 design §2.1c 条③ P3 口径，如实登记）：版本删除的**上传者例外面**
 * （`createdBy === 我` 的草稿）在前端判定不可达——`VersionListItem` 不含 `createdBy`
 * ⇒ UI 只按「管理档 / 非管理档」两档出态，**最终以服务端 400 + toast 为准**。
 */
import type { VersionStatus } from '../api/types.js';
import { hasRole, ROLE } from '../auth/roles.js';

/** 判定所需的最小观看者形状（`hooks/useViewer` 的 `Viewer` 子集——纯函数只吃这两项） */
export interface PermissionViewer {
  userId: string | null;
  role: number | null;
}

/** 可管理（状态治理 / 删除资产 / 发布新版本 / 标签增删）—— 对齐 `canManageAsset` */
export function canManage(viewer: PermissionViewer, asset: { ownerId: string }): boolean {
  if (viewer.userId !== null && viewer.userId === asset.ownerId) return true;
  return hasRole(viewer.role, ROLE.ADMIN);
}

/** 撤回分发（yank）—— 仅管理档（owner 不可，服务端同判） */
export function canYank(viewer: Pick<PermissionViewer, 'role'>): boolean {
  return hasRole(viewer.role, ROLE.ADMIN);
}

/** 特权标签（PRIVILEGED）增删 —— 仅超管 */
export function canPrivileged(viewer: Pick<PermissionViewer, 'role'>): boolean {
  return hasRole(viewer.role, ROLE.SUPER_ADMIN);
}

/** 管理档可删 4 态（服务端 `DELETABLE_MANAGER`） */
export const DELETABLE_BY_MANAGER: readonly VersionStatus[] = [
  'DRAFT',
  'SCAN_FAILED',
  'REJECTED',
  'UPLOADED',
];

/** owner / 上传者本人可删 2 态（服务端 `DELETABLE_UPLOADER`，草稿族） */
export const DELETABLE_BY_UPLOADER: readonly VersionStatus[] = ['DRAFT', 'SCAN_FAILED'];

/** 当前档位可删的版本状态集 */
export function deletableStatuses(viewerRole: number | null): readonly VersionStatus[] {
  return hasRole(viewerRole, ROLE.ADMIN) ? DELETABLE_BY_MANAGER : DELETABLE_BY_UPLOADER;
}

/** 单版本是否可删（当前档位）—— 传 `true` = 管理档（调用方已判定 canManage 时可用） */
export function isVersionDeletable(
  status: VersionStatus,
  viewerRoleOrManager: number | null | boolean,
): boolean {
  const set =
    typeof viewerRoleOrManager === 'boolean'
      ? viewerRoleOrManager
        ? DELETABLE_BY_MANAGER
        : DELETABLE_BY_UPLOADER
      : deletableStatuses(viewerRoleOrManager);
  return set.includes(status);
}
