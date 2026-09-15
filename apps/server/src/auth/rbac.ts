import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { user } from '../db/schema/index.js';
import { ACCOUNT_ROLE, type AccountRole, accountRoleOf } from './roles.js';

/**
 * 角色判定（M4-pre design §2.2）：**唯一轴 4 档线性** —— 0 未登录 / 1 用户 / 10 管理 / 100 超管。
 *
 * M4b-pre T3 变更（design §4.1 · R4）：**读面从 `user_account.role`（smallint）切到官方
 * `user.role`（档名文本）** —— 数值序由 `roles.ts` 的 `accountRoleOf` 单点映射提供，
 * **本类导出签名与语义保持不变**（57 处调用面零改动：`requireRole()` 1 · `ACCOUNT_ROLE.` 32/10 文件 ·
 * `requireAuth()` 24）。
 *
 * 判定链：
 *  ① 账号状态：非 ACTIVE（DISABLED / PENDING / 不存在）→ 无角色（等同未登录）
 *  ② 层级比较：`role >= minRole`（SUPER_ADMIN = 100 天然覆盖全部，**无需短路分支**）
 *
 * 资源级判定（owner 本人可管自己的资产）由业务层组合：`roleOf` + `asset.ownerId` 比对
 * （`assets/manage.ts` 的 `canManageAsset`）。
 */

/** 账号状态三态（官方 `user.status` 为 text 列，此处收敛为字面量联合） */
export type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';

function asStatus(value: string | null | undefined): UserStatus | null {
  return value === 'ACTIVE' || value === 'PENDING' || value === 'DISABLED' ? value : null;
}

export class RbacService {
  constructor(private readonly db: Db) {}

  /** 账号状态（05 §4.1；requireAuth 组合判定用） */
  async getAccountStatus(userId: string): Promise<UserStatus | null> {
    const rows = await this.db
      .select({ status: user.status })
      .from(user)
      .where(eq(user.id, userId));
    return asStatus(rows[0]?.status);
  }

  /** 有效角色档位：非 ACTIVE / 账号不存在 / 档名非法 → `null`（与未登录同权） */
  async roleOf(userId: string): Promise<AccountRole | null> {
    const rows = await this.db
      .select({ role: user.role, status: user.status })
      .from(user)
      .where(eq(user.id, userId));
    const row = rows[0];
    if (!row || row.status !== 'ACTIVE') return null;
    return accountRoleOf(row.role);
  }

  /**
   * 层级判定：`role >= minRole`（账号须 ACTIVE）。
   *
   * 保留说明（M4-pre 审查 F30）：生产路径当前**无调用者**——HTTP 层统一用
   * `requireRole(minRole)` 中间件（`http/auth-middleware.ts`）做档位判定；本方法为
   * **命令式调用侧**（服务内部组合判定，如将来的 M4b 管理面「按档位取激活集」）保留，
   * 且已有直接单测（`auth/rbac.test.ts`）。删掉会让服务内判定被迫重复实现层级比较。
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
