/**
 * Hono 请求上下文**取值器**（统一替代 `c.get('x')!` / `c.req.param('x')!`）。
 *
 * 为什么：这些值由中间件（`requestContextMiddleware` / `rbacContext` / 官方会话中间件）或**路由路径模板**
 * 保证存在；历史上用非空断言 `!` 表达「必然存在」。但 `!` 被 `noNonNullAssertion` 禁（本批 (B) 类清理），
 * 且真缺失时 `!` 只会让错误在更远处以 TypeError 爆掉。
 * 取值器把「必然存在」写成**显式取值 + 缺即抛** —— 语义不变（同为一个 500），但错误信息可诊断、可定位。
 *
 * 适用范围：HTTP 层内部（`http/*.ts`）。
 */
import type { Context } from 'hono';
import type { RbacService } from '../auth/rbac.js';
import type { Principal } from './auth-middleware.js';

/** `requireAuth()` 注入的会话主体（缺失 = 路由忘了挂中间件，属编程错误） */
export function principalOf(c: Context): Principal {
  const principal = c.get('principal');
  if (!principal) throw new Error('principal 缺失：该路由未挂 requireAuth()');
  return principal;
}

/** 装配层 `rbacContext` 注入的 rbac 实例（缺失 = 装配层漏挂） */
export function rbacOf(c: Context): RbacService {
  const rbac = c.get('rbac');
  if (!rbac) throw new Error('rbac 缺失：装配层未挂 rbacContext()');
  return rbac;
}

/** 路径参数（路由模板 `:name` 保证存在） */
export function paramOf(c: Context, name: string): string {
  const value = c.req.param(name);
  if (value === undefined) throw new Error(`路径参数缺失：:${name}`);
  return value;
}
