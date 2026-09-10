import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { ACCOUNT_ROLE, type AccountRole, userAccount } from '../db/schema/index.js';

/**
 * 角色判定（M4-pre design §2.2）：**唯一轴 4 档线性** —— 0 未登录 / 1 用户 / 10 管理 / 100 超管。
 *
 * 判定链：
 *  ① 账号状态：非 ACTIVE（DISABLED / PENDING / 不存在）→ 无角色（等同未登录）
 *  ② 层级比较：`role >= minRole`（SUPER_ADMIN = 100 天然覆盖全部，**无需短路分支**）
 *
 * 资源级判定（owner 本人可管自己的资产）由业务层组合：`roleOf` + `asset.ownerId` 比对
 * （`assets/manage.ts` 的 `canManageAsset`）。
 *
 * M4-pre S2（板块 B）：空间面已整体删除——原 `can()` / `getNamespaceRoles()` / 空间状态门
 * （S1 期的过渡态）随 `namespace` 域一并移除。
 */

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

  /**
   * 层级判定：`role >= minRole`（账号须 ACTIVE）。
   *
   * 保留说明（M4-pre 审查 F30）：生产路径当前**无调用者**——HTTP 层统一用
   * `requireRole(minRole)` 中间件（`http/auth-middleware.ts`）做档位判定；本方法为
   * **命令式调用侧**（服务内部组合判定，如将来的 M4b 管理面「按档位取激活集」）保留，
   * 且已有 11 处直接单测（`auth/rbac.test.ts`）。删掉会让服务内判定被迫重复实现层级比较。
   */
  async hasRole(userId: string, minRole: AccountRole): Promise<boolean> {
    const role = await this.roleOf(userId);
    return role !== null && role >= minRole;
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
