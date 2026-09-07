import type { Context, Next } from 'hono';
import { AuthError } from '../auth/errors.js';
import type { RbacService } from '../auth/rbac.js';
import type { RoleCode } from '../db/schema/index.js';

/**
 * 鉴权与授权中间件（T1，05 §6.3 判定链在 HTTP 层的组合）：
 * - requireAuth：principal 存在 + 账号状态 ACTIVE（05 §4.1：DISABLED/PENDING 拒绝全部）
 * - requirePermission(code, {namespaceId?})：rbac.can 判定链（含 SUPER_ADMIN 短路）
 * - requirePlatformRole(roles)：平台角色命中任一（T3 建空间用，skillhub 平台角色判定同构）
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

export function requirePermission(code: string, opts: { namespaceId?: number } = {}) {
  return async (c: Context, next: Next) => {
    const principal = c.get('principal');
    if (!principal) throw new AuthError('auth.session_expired');
    const rbac = requireRbac(c);
    const allowed = await rbac.can(principal.userId, code, opts);
    if (!allowed) throw new AuthError('auth.forbidden');
    await next();
  };
}

export function requirePlatformRole(roles: readonly RoleCode[]) {
  return async (c: Context, next: Next) => {
    const principal = c.get('principal');
    if (!principal) throw new AuthError('auth.session_expired');
    const rbac = requireRbac(c);
    const status = await rbac.getAccountStatus(principal.userId);
    if (status !== 'ACTIVE') throw new AuthError('auth.session_expired');
    const userRoles = await rbac.platformRolesOf(principal.userId);
    // SUPER_ADMIN 隐式短路（05 §6.3：超管全权——调用方无需手动列 SUPER_ADMIN，防漏）
    if (userRoles.includes('SUPER_ADMIN')) {
      await next();
      return;
    }
    if (!roles.some((role) => userRoles.includes(role))) {
      throw new AuthError('auth.forbidden');
    }
    await next();
  };
}
