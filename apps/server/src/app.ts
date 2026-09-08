import { Hono } from 'hono';
import { AssetError } from './assets/errors.js';
import type { AuditWriter } from './audit/audit.js';
import { AuthService } from './auth/auth-service.js';
import { csrfProtection } from './auth/csrf.js';
import { DevicePendingStore } from './auth/device-store.js';
import { AuthError } from './auth/errors.js';
import type { LdapChannel } from './auth/ldap.js';
import type { RateLimiter } from './auth/rate-limit.js';
import { InMemoryRateLimiter } from './auth/rate-limit.js';
import { RbacService } from './auth/rbac.js';
import { createAuthRoutes } from './auth/routes.js';
import type { SessionManager } from './auth/session.js';
import { sessionMiddleware } from './auth/session-middleware.js';
import { UserService } from './auth/users.js';
import type { Db } from './db/client.js';
import { createAuditRoutes } from './http/audit.js';
import { rbacContext } from './http/auth-middleware.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './http/assets.js';
import { APPROVE_LIMIT, createDeviceRoutes, REQUEST_LIMIT } from './http/device-routes.js';
import { createNamespaceRoutes } from './http/namespaces.js';
import { createOidcRoutes } from './http/oidc-routes.js';
import { requestContextMiddleware } from './http/request-context.js';
import { tokenAuthMiddleware } from './http/token-middleware.js';
import { createTokenRoutes } from './http/tokens.js';
import type { ObjectStorage } from './storage/types.js';

/**
 * Hono app 工厂——依赖注入便于测试（真实 PG + 内存 session + fake LDAP）。
 */
export interface AppDeps {
  db: Db;
  sessions: SessionManager;
  audit: AuditWriter;
  rateLimiter: RateLimiter;
  /** 上传限流（T13——独立实例：UPLOAD_RATE_LIMIT 常量装配） */
  uploadRateLimiter?: RateLimiter;
  ldap: LdapChannel | null;
  storage: ObjectStorage;
  registrationEnabled: boolean;
  sessionTtlHours: number;
  cookieSecure: boolean;
  csrfAllowedOrigins?: string[];
  /** 对外基址（Device verificationUri / OIDC 302 推导；缺省 localhost:3000） */
  publicBaseUrl?: string;
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
  // Device Flow 状态（app 级单例：pending 跨请求共享；TTL 惰性清理同 Session 模式）
  const deviceStore = new DevicePendingStore();

  const app = new Hono();
  app.use('*', requestContextMiddleware());
  app.use('*', rbacContext(rbac));
  // 认证装配序（T17）：Bearer 显式优先 → 无则回退 session cookie（token → session）
  app.use('/api/*', tokenAuthMiddleware(deps.db));
  app.use('/api/*', sessionMiddleware(deps.sessions));
  // T30：Device 匿名端点（/api/auth/device、/api/auth/device/token）CSRF 豁免——
  // 无 cookie 认证面；approve（cookie 通道）不在豁免列表保持保护
  app.use(
    '/api/*',
    csrfProtection({
      allowedOrigins: deps.csrfAllowedOrigins,
      exemptPaths: ['/api/auth/device', '/api/auth/device/token'],
    }),
  );

  // 统一错误出口：AuthError/AssetError → 结构化 {code,message}；其余 500
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 409 | 429,
      );
    }
    if (err instanceof AssetError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 404 | 409 | 413,
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

  app.route('/api/namespaces', createNamespaceRoutes({ db: deps.db }));
  app.route('/api/assets', createAssetRoutes({
    db: deps.db,
    audit: deps.audit,
    storage: deps.storage,
    uploadRateLimiter: deps.uploadRateLimiter ?? new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max),
  }));
  app.route('/api/tokens', createTokenRoutes({ db: deps.db }));
  app.route('/api/audit', createAuditRoutes({ db: deps.db }));
  // Device Flow（T30-T33；anonymous 端点豁免 CSRF——见装配；approve 走 cookie 通道）
  app.route(
    '/api/auth/device',
    createDeviceRoutes({
      db: deps.db,
      store: deviceStore,
      // 匿名请求独立限流实例（10/分钟，不与登录共享 key 空间）
      rateLimiter: new InMemoryRateLimiter(REQUEST_LIMIT.windowMs, REQUEST_LIMIT.max),
      // approve 尝试限流（T33：每 user_code 5 次/分钟）
      approveRateLimiter: new InMemoryRateLimiter(APPROVE_LIMIT.windowMs, APPROVE_LIMIT.max),
      publicBaseUrl: deps.publicBaseUrl ?? 'http://localhost:3000',
    }),
  );
  // OIDC 授权码流（T24/T25；authorize/callback 为访客端点——无 requireAuth，走独立 state cookie）
  app.route(
    '/api/auth/oidc',
    createOidcRoutes({
      db: deps.db,
      sessions: deps.sessions,
      cookieSecure: deps.cookieSecure,
      sessionTtlHours: deps.sessionTtlHours,
    }),
  );

  return app;
}
