import type { Context, Next } from 'hono';
import type { AihAuth } from '../auth/better-auth.js';
import { AuthError } from '../auth/errors.js';
import type { RbacService } from '../auth/rbac.js';
import type { AccountRole } from '../auth/roles.js';
import type { TokenScopeCode } from '../auth/token-scopes.js';

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

/**
 * 会话主体（middleware 注入 `c.set('principal')`）。
 * M4b-pre T3：原 `auth/session.ts` 的 `Principal` 随自研会话存储一并迁到 HTTP 层
 * （官方 `getSession` 是唯一来源；`auth/session.ts` 已删）。
 */
export interface Principal {
  userId: string;
  displayName: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    principal?: Principal;
    /** 官方会话行 id（审计/登出关联；Bearer 通道为 undefined） */
    sessionId?: string;
  }
}

/** 装配层注入 rbac（app.ts use('*')） */
export function rbacContext(rbac: RbacService) {
  return async (c: Context, next: Next) => {
    c.set('rbac', rbac);
    await next();
  };
}

/**
 * 官方会话中间件（design R17：取代自研 `sessionMiddleware` + `InMemorySessionStore`）：
 * `auth.api.getSession({ headers })` → 官方 `session` 表校验 cookie 并回读用户；
 * 有效且账号 `status === 'ACTIVE'` → 注入 principal（否则保持匿名，401 由路由/requireAuth 判定）。
 *
 * 分层说明（防双门互斥）：**明确非 ACTIVE 一律不注入**（DISABLED/PENDING 等同未登录）；
 * official 若未回传 `status`（字段面变化）则此处不判、由 `requireAuth` 的 DB 状态门兜底——
 * 两层同向从严，不会出现「漏放」。
 */
export function officialSessionMiddleware(auth: AihAuth) {
  return async (c: Context, next: Next) => {
    // T17：Bearer 显式通道在场 → cookie 会话不参与（含无效 Bearer 不降级，防凭证混淆）
    if (c.get('authVia') === 'bearer') {
      await next();
      return;
    }
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session) {
      const status = (session.user as unknown as { status?: string | null }).status;
      if (status === undefined || status === 'ACTIVE') {
        c.set('principal', {
          userId: session.user.id,
          displayName: session.user.name,
        });
        c.set('sessionId', session.session.id);
      }
    }
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
