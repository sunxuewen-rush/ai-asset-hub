import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import {
  ACCOUNT_ROLE,
  type AccountRole,
  namespace,
  namespaceMember,
  userAccount,
} from '../db/schema/index.js';

/**
 * 角色判定（M4-pre design §2.2）：**唯一轴 4 档线性** —— 0 未登录 / 1 用户 / 10 管理 / 100 超管。
 *
 * 判定链：
 *  ① 账号状态：非 ACTIVE（DISABLED / PENDING / 不存在）→ 无角色（等同未登录）
 *  ② 层级比较：`role >= minRole`（SUPER_ADMIN = 100 天然覆盖全部，**无需短路分支**）
 *
 * 资源级判定（owner 本人可管自己的资产）由业务层组合：`roleOf` + `asset.ownerId` 比对。
 *
 * ⚠️ **过渡态（M4-pre S1 → S2 之间）**：`can()` / `getNamespaceRoles()` / 空间状态检查
 * 暂予保留，供空间相关调用点（publish / submit / approve / space-manage）在 S2 删除空间前
 * 继续工作——其**平台侧**判定已换为 4 档（`role >= ADMIN`，即原 ASSET_ADMIN / USER_ADMIN /
 * AUDITOR 三个码表的合并），**空间侧**保持原语义不变。S2（板块 B / T6）随空间一并删除。
 */

/** 空间角色 → 可执行操作面（过渡期映射；S2 随空间删除） */
const SPACE_ROLE_OPS: Record<string, readonly string[]> = {
  OWNER: ['asset:publish', 'review:submit', 'asset:manage', 'review:approve', 'namespace:manage'],
  ADMIN: ['asset:publish', 'review:submit', 'asset:manage', 'review:approve', 'namespace:manage'],
  MEMBER: ['asset:publish'],
};

/** 写类操作（FROZEN 空间拒写，05 §6.3 第 6 步；过渡期） */
const WRITE_OPS: ReadonlySet<string> = new Set([
  'asset:publish',
  'review:submit',
  'asset:manage',
  'review:approve',
  'namespace:manage',
]);

export interface CanContext {
  /** 涉及空间资源时传入（过渡期；S2 删） */
  namespaceId?: number;
}

export class RbacService {
  constructor(private readonly db: Db) {}

  /** 账号状态（05 §4.1；requireAuth 组合判定用） */
  async getAccountStatus(userId: string): Promise<'PENDING' | 'ACTIVE' | 'DISABLED' | null> {
    const rows = await this.db
      .select({ status: userAccount.status })
      .from(userAccount)
      .where(eq(userAccount.id, userId));
    return rows[0]?.status ?? null;
  }

  /** 有效角色档位：非 ACTIVE / 账号不存在 → `null`（与未登录同权） */
  async roleOf(userId: string): Promise<AccountRole | null> {
    const rows = await this.db
      .select({ role: userAccount.role, status: userAccount.status })
      .from(userAccount)
      .where(eq(userAccount.id, userId));
    const row = rows[0];
    if (!row || row.status !== 'ACTIVE') return null;
    return row.role;
  }

  /** 层级判定：`role >= minRole`（账号须 ACTIVE） */
  async hasRole(userId: string, minRole: AccountRole): Promise<boolean> {
    const role = await this.roleOf(userId);
    return role !== null && role >= minRole;
  }

  /**
   * 操作判定（**过渡态**，S2 删除）：
   * 平台侧 = `role >= ADMIN`（原 ASSET_ADMIN / USER_ADMIN / AUDITOR 码表合并后的等价语义）；
   * 涉及空间时叠加空间状态（FROZEN 拒写 / ARCHIVED 拒绝）与空间角色面。
   */
  async can(userId: string, op: string, ctx: CanContext = {}): Promise<boolean> {
    const role = await this.roleOf(userId);
    if (role === null) return false; // 非 ACTIVE → 拒绝全部
    if (role >= ACCOUNT_ROLE.ADMIN) return true; // 管理档：平台侧全权

    if (ctx.namespaceId !== undefined) {
      const nsStatus = await this.getNamespaceStatus(ctx.namespaceId);
      if (nsStatus === 'FROZEN' && WRITE_OPS.has(op)) return false;
      if (nsStatus === 'ARCHIVED') return false; // 归档对外不可见（05 §6.2）
      const nsRoles = await this.getNamespaceRoles(userId, ctx.namespaceId);
      const allowed = nsRoles.some((r) => (SPACE_ROLE_OPS[r] ?? []).includes(op));
      if (allowed) return true;
    }

    return false;
  }

  /** 空间角色（**过渡态**，S2 删除） */
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

export type { AccountRole };
export { ACCOUNT_ROLE };

/** 防自审助手（05 §6.4：审核人不得是提交人；SUPER_ADMIN 例外由调用方传 isSuperAdmin 放行） */
export function isSelfReview(
  submittedBy: string,
  reviewedBy: string,
  isSuperAdmin = false,
): boolean {
  if (isSuperAdmin) return false; // SUPER_ADMIN 例外
  return submittedBy === reviewedBy;
}
