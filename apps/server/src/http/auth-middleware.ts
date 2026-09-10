import type { Context, Next } from 'hono';
import { AuthError } from '../auth/errors.js';
import type { RbacService } from '../auth/rbac.js';
import type { TokenScopeCode } from '../auth/token-scopes.js';
import type { AccountRole } from '../db/schema/index.js';

/**
 * 鉴权与授权中间件（M4-pre design §2.2 判定链在 HTTP 层的组合）：
 * - `requireAuth`：principal 存在 + 账号状态 ACTIVE（05 §4.1：DISABLED/PENDING 拒绝全部）
 * - `requireRole(minRole, { scope? })`：角色层级 `role >= minRole`（含 SUPER_ADMIN 天然覆盖）；
 *   可选 token scope 交集（**原 `requirePermission` 的双职责合并**——角色门 + 凭证 scope 门）
 * rbac 实例由装配层经 rbacContext 注入请求上下文（依赖注入便于测试）。
 */

declare module 'hono' {
  interface ContextVariableMap {
    rbac?: RbacService;
  }
}

/** 装配层注入 rbac（app.ts use('*')） */
export function rbacContext(rbac: RbacService) {
  return async (c: Context, next: Next) => {
    c.set('rbac', rbac);
    await next();
  };
}

function requireRbac(c: Context): RbacService {
  const rbac = c.get('rbac');
  if (!rbac) throw new Error('rbac not injected via rbacContext (app assembly error)');
  return rbac;
}

/** 账号状态门（05 §4.1：DISABLED/PENDING 拒全部，401 session_expired 语义） */
async function assertActiveAccount(c: Context, userId: string): Promise<void> {
  const rbac = requireRbac(c);
  const status = await rbac.getAccountStatus(userId);
  if (status !== 'ACTIVE') throw new AuthError('auth.session_expired');
}

export function requireAuth() {
  return async (c: Context, next: Next) => {
    const principal = c.get('principal');
    if (!principal) throw new AuthError('auth.session_expired');
    await assertActiveAccount(c, principal.userId);
    await next();
  };
}

/**
 * token scope 交集判定（M3 design §8 R14）：session 通道恒过（无 scope）；
 * token 通道 scope 非空时要求含 code（凭证级白名单——白名单外拒）。
 * '' / 'cli'（全量）经 parseTokenScope → null → 恒过（M1 零破坏）。
 * 出口与角色拒同（auth.forbidden——不泄露 scope 细节）。
 */
export function assertTokenScoped(c: Context, code: TokenScopeCode): void {
  const scopes = c.get('tokenScopes');
  if (scopes === undefined || scopes === null) return;
  if (!scopes.has(code)) throw new AuthError('auth.forbidden');
}

/**
 * 角色门（M4-pre design §2.2）：`role >= minRole`。
 * - 无 principal / 账号非 ACTIVE → 401 `auth.session_expired`（与未登录同出口）
 * - 角色不足 → 403 `auth.forbidden`
 * - 可选 `scope` → 叠加 token scope 交集（token 凭证通道）
 */
export function requireRole(minRole: AccountRole, opts: { scope?: TokenScopeCode } = {}) {
  return async (c: Context, next: Next) => {
    const principal = c.get('principal');
    if (!principal) throw new AuthError('auth.session_expired');
    const rbac = requireRbac(c);
    const role = await rbac.roleOf(principal.userId);
    if (role === null) throw new AuthError('auth.session_expired');
    if (role < minRole) throw new AuthError('auth.forbidden');
    if (opts.scope !== undefined) assertTokenScoped(c, opts.scope);
    await next();
  };
}
