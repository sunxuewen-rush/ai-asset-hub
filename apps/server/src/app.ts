import { Hono } from 'hono';
import type { AuditWriter } from './audit/audit.js';
import { AuthService } from './auth/auth-service.js';
import { csrfProtection } from './auth/csrf.js';
import { AuthError } from './auth/errors.js';
import type { LdapChannel } from './auth/ldap.js';
import type { RateLimiter } from './auth/rate-limit.js';
import { RbacService } from './auth/rbac.js';
import { createAuthRoutes } from './auth/routes.js';
import type { SessionManager } from './auth/session.js';
import { sessionMiddleware } from './auth/session-middleware.js';
import { UserService } from './auth/users.js';
import type { Db } from './db/client.js';
import { rbacContext } from './http/auth-middleware.js';
import { requestContextMiddleware } from './http/request-context.js';

/**
 * Hono app 工厂——依赖注入便于测试（真实 PG + 内存 session + fake LDAP）。
 */
export interface AppDeps {
  db: Db;
  sessions: SessionManager;
  audit: AuditWriter;
  rateLimiter: RateLimiter;
  ldap: LdapChannel | null;
  registrationEnabled: boolean;
  sessionTtlHours: number;
  cookieSecure: boolean;
  csrfAllowedOrigins?: string[];
}

export function createApp(deps: AppDeps): Hono {
  const users = new UserService(deps.db, { registrationEnabled: deps.registrationEnabled });
  const authService = new AuthService({
    db: deps.db,
    users,
    ldap: deps.ldap,
    audit: deps.audit,
  });
  const rbac = new RbacService(deps.db);

  const app = new Hono();
  app.use('*', requestContextMiddleware());
  app.use('*', rbacContext(rbac));
  app.use('/api/*', sessionMiddleware(deps.sessions));
  app.use('/api/*', csrfProtection({ allowedOrigins: deps.csrfAllowedOrigins }));

  // 统一错误出口：AuthError → 结构化 {code,message}；其余 500（T1 补全，防中间件异常裸 500）
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 409 | 429,
      );
    }
    console.error('[server] unhandled error:', err);
    return c.json({ code: 'internal_error', message: 'internal server error' }, 500);
  });

  app.get('/healthz', (c) => c.json({ status: 'ok' }));
  app.route(
    '/api/auth',
    createAuthRoutes({
      authService,
      sessions: deps.sessions,
      audit: deps.audit,
      rateLimiter: deps.rateLimiter,
      registrationEnabled: deps.registrationEnabled,
      sessionTtlHours: deps.sessionTtlHours,
      cookieSecure: deps.cookieSecure,
    }),
  );

  return app;
}
