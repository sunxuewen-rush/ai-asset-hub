import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  namespace,
  namespaceMember,
  permission,
  role,
  rolePermission,
  userAccount,
  userRoleBinding,
} from '../db/schema/index.js';
import { PERMISSIONS } from './permissions.js';

/**
 * RBAC 判定链（05 §6.3 第 1-7 步）：
 * 账号状态（DISABLED/PENDING 拒全部）→ 平台权限 → SUPER_ADMIN 短路 →
 * 命名空间角色（涉及空间资源时）→ 空间状态（FROZEN 拒写）→ 合并判定。
 * owner 本人判定（05 §6.4：asset:manage 空间 ADMIN 以上或 owner）由业务层组合：
 * `can(userId, perm, ns)` 或 `isOwner` + 资源比对。
 */

/** 命名空间角色 → 权限面（05 §6.2/§6.4）：OWNER/ADMIN 空间内完整管理权（§6.5 主轴） */
export const NS_ROLE_OWNER_PERMS: readonly string[] = [
  PERMISSIONS.assetPublish,
  PERMISSIONS.reviewSubmit,
  PERMISSIONS.assetManage,
  PERMISSIONS.assetPromote,
  PERMISSIONS.reviewApprove,
  PERMISSIONS.namespaceManage,
];
export const NS_ROLE_ADMIN_PERMS: readonly string[] = NS_ROLE_OWNER_PERMS;
/** MEMBER 仅可发布新资产（05 §6.4：review:submit 需 owner 本人或 ADMIN/OWNER——owner 判定走业务层组合） */
export const NS_ROLE_MEMBER_PERMS: readonly string[] = [PERMISSIONS.assetPublish];

/** 写类权限（FROZEN 空间拒绝 05 §6.3 第 6 步） */
export const WRITE_PERMISSIONS: ReadonlySet<string> = new Set([
  PERMISSIONS.assetPublish,
  PERMISSIONS.reviewSubmit,
  PERMISSIONS.assetManage,
  PERMISSIONS.assetPromote,
  PERMISSIONS.reviewApprove,
  PERMISSIONS.namespaceManage,
  PERMISSIONS.userManage,
  PERMISSIONS.userApprove,
  PERMISSIONS.promotionApprove,
]);

export interface CanContext {
  /** 涉及命名空间资源时传入（05 §6.3 第 5-6 步） */
  namespaceId?: number;
}

export class RbacService {
  constructor(private readonly db: Db) {}

  /** 账号状态查询（05 §4.1；requireAuth 组合判定用） */
  async getAccountStatus(userId: string): Promise<'PENDING' | 'ACTIVE' | 'DISABLED' | null> {
    const rows = await this.db
      .select({ status: userAccount.status })
      .from(userAccount)
      .where(eq(userAccount.id, userId));
    return rows[0]?.status ?? null;
  }

  /** 平台角色 codes + permission codes（role → role_permission → permission 三表 join） */
  private async platformGrants(
    userId: string,
  ): Promise<{ roles: Set<string>; permissions: Set<string> }> {
    const rows = await this.db
      .select({ roleCode: role.code, permCode: permission.code })
      .from(userRoleBinding)
      .innerJoin(role, eq(userRoleBinding.roleId, role.id))
      .leftJoin(rolePermission, eq(role.id, rolePermission.roleId))
      .leftJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(eq(userRoleBinding.userId, userId));
    const roles = new Set<string>();
    const perms = new Set<string>();
    for (const row of rows) {
      roles.add(row.roleCode);
      if (row.permCode) perms.add(row.permCode);
    }
    return { roles, permissions: perms };
  }

  /** 平台角色 codes（T1/T3 requirePlatformRole 判定；skillhub 平台角色判定同构） */
  async platformRolesOf(userId: string): Promise<string[]> {
    const { roles } = await this.platformGrants(userId);
    return [...roles];
  }

  /** 判定链（05 §6.3 1-7 步） */
  async can(userId: string, requiredPermission: string, ctx: CanContext = {}): Promise<boolean> {
    // 1-2：账号状态
    const status = await this.getAccountStatus(userId);
    if (status !== 'ACTIVE') return false; // DISABLED/PENDING/不存在 → 拒绝全部

    // 3：平台角色权限
    const grants = await this.platformGrants(userId);
    const { roles: platformRoles, permissions: platformPermissions } = grants;

    // 4：SUPER_ADMIN 短路
    if (platformRoles.has('SUPER_ADMIN')) return true;

    // 平台权限命中（ASSET_ADMIN/USER_ADMIN/AUDITOR 绑定的 permission）
    if (platformPermissions.has(requiredPermission)) return true;

    // 5-6：涉及命名空间资源
    if (ctx.namespaceId !== undefined) {
      const nsStatus = await this.getNamespaceStatus(ctx.namespaceId);
      // 6：FROZEN 拒写
      if (nsStatus === 'FROZEN' && WRITE_PERMISSIONS.has(requiredPermission)) return false;
      if (nsStatus === 'ARCHIVED') return false; // 归档对外不可见（05 §6.2）

      const nsRoles = await this.getNamespaceRoles(userId, ctx.namespaceId);
      const allowedByNs = nsRoles.some((roleName) => {
        const map =
          roleName === 'OWNER'
            ? NS_ROLE_OWNER_PERMS
            : roleName === 'ADMIN'
              ? NS_ROLE_ADMIN_PERMS
              : roleName === 'MEMBER'
                ? NS_ROLE_MEMBER_PERMS
                : [];
        return map.includes(requiredPermission);
      });
      if (allowedByNs) return true;
    }

    return false;
  }

  /** 命名空间角色（namespace_member join；无成员关系 → 空） */
  async getNamespaceRoles(userId: string, namespaceId: number): Promise<string[]> {
    const rows = await this.db
      .select({ memberRole: namespaceMember.role })
      .from(namespaceMember)
      .where(and(eq(namespaceMember.userId, userId), eq(namespaceMember.namespaceId, namespaceId)));
    return rows.map((r) => r.memberRole);
  }

  private async getNamespaceStatus(namespaceId: number): Promise<string | null> {
    const rows = await this.db
      .select({ status: namespace.status })
      .from(namespace)
      .where(eq(namespace.id, namespaceId));
    return rows[0]?.status ?? null;
  }
}

/** 防自审助手（05 §6.4：审核人不得是提交人；SUPER_ADMIN 例外由调用方传 isSuperAdmin 放行） */
export function isSelfReview(
  submittedBy: string,
  reviewedBy: string,
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin) return false; // SUPER_ADMIN 例外
  return submittedBy === reviewedBy;
}
