import { Hono } from 'hono';
import { AssetError } from './assets/errors.js';
import { AUDIT_ACTIONS, type AuditWriter, auditMetaFromHeaders } from './audit/audit.js';
import { type AihAuth, createAuth } from './auth/better-auth.js';
import { DevicePendingStore } from './auth/device-store.js';
import { AuthError } from './auth/errors.js';
import type { LdapChannel } from './auth/ldap.js';
import { InMemoryRateLimiter, type RateLimiter } from './auth/rate-limit.js';
import { RbacService } from './auth/rbac.js';
import { getEnv } from './config/env.js';
import type { Db } from './db/client.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './http/assets.js';
import { createAuditRoutes } from './http/audit.js';
import { officialSessionMiddleware, rbacContext } from './http/auth-middleware.js';
import { createAuthRoutes } from './http/auth-routes.js';
import { APPROVE_LIMIT, createDeviceRoutes, REQUEST_LIMIT } from './http/device-routes.js';
import { createLabelRoutes } from './http/labels.js';
import { createOidcRoutes } from './http/oidc-routes.js';
import { trustedOriginGuard } from './http/origin-guard.js';
import { requestContextMiddleware } from './http/request-context.js';
import { createReviewRoutes } from './http/reviews.js';
import { createStatsRoutes } from './http/stats.js';
import { tokenAuthMiddleware } from './http/token-middleware.js';
import { createTokenRoutes } from './http/tokens.js';
import { LabelError } from './labels/errors.js';
import { ReviewError } from './review/errors.js';
import type { ObjectStorage } from './storage/types.js';

/**
 * Hono app 工厂——依赖注入便于测试（真实 PG + 官方 better-auth 实例 + fake LDAP）。
 *
 * M4b-pre T3 装配变更（design §4.1「app.ts」行）：
 * - 认证端点整体交官方 handler（`/api/auth/*`），**自留只有 `GET /api/auth/me`**（形状不变的薄层）
 * - 会话中间件换官方 `getSession` 薄封装（`officialSessionMiddleware`）；自研 `sessionMiddleware` /
 *   `InMemorySessionStore` / `csrfProtection` 全部删除
 * - Origin 校验：官方端点交官方（`trustedOrigins` + 官方 origin-check）；**业务面 + 自留 device/approve
 *   由 `trustedOriginGuard` 补回**（与官方同源语义、同一白名单：`auth.$context.isTrustedOrigin`）——
 *   `csrfProtection` 删除后业务面 cookie 写请求的防线回归（T3 收尾，用户 2026-09-15 批准）
 * - 装配序：`tokenAuthMiddleware`（Bearer 显式通道）→ `trustedOriginGuard` → `officialSessionMiddleware` → 路由
 * - 官方 catch-all **最后注册**：自留路由（`/me`、`/device/*`、`/oidc/*`）先注册才不被吞
 */
export interface AppDeps {
  db: Db;
  audit: AuditWriter;
  rateLimiter: RateLimiter;
  /** 上传限流（T13——独立实例：UPLOAD_RATE_LIMIT 常量装配） */
  uploadRateLimiter?: RateLimiter;
  ldap: LdapChannel | null;
  storage: ObjectStorage;
  cookieSecure: boolean;
  /** 对外基址（Device verificationUri / OIDC 302 推导；缺省 localhost:3000） */
  publicBaseUrl?: string;
  /** 官方实例（可选注入；缺省按本 deps 构造——含 LDAP 通道/审计/登录限流） */
  auth?: AihAuth;
}

export function createApp(deps: AppDeps): Hono {
  const rbac = new RbacService(deps.db);
  const auth =
    deps.auth ?? createAuth({ ldap: deps.ldap, audit: deps.audit, rateLimiter: deps.rateLimiter });
  // Device Flow 状态（app 级单例：pending 跨请求共享；TTL 惰性清理——随 T5 交官方 device_code 表）
  const deviceStore = new DevicePendingStore();

  const app = new Hono();
  app.use('*', requestContextMiddleware());
  app.use('*', rbacContext(rbac));
  // 认证装配序（T17）：Bearer 显式优先 → 无则官方 session cookie（token → session）
  app.use('/api/*', tokenAuthMiddleware(deps.db));
  // 业务面同源守卫（在会话语义前拒绝，省一次会话查询；官方平面自带校验故内部排除）
  app.use('/api/*', trustedOriginGuard(auth));
  app.use('/api/*', officialSessionMiddleware(auth));

  // 统一错误出口：AuthError/AssetError → 结构化 {code,message}；其余 500
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 404 | 409 | 429,
      );
    }
    if (err instanceof AssetError) {
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 404 | 409 | 413);
    }
    if (err instanceof ReviewError) {
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404);
    }
    if (err instanceof LabelError) {
      return c.json({ code: err.code, message: err.message }, err.status as 400 | 403 | 404 | 409);
    }
    console.error('[server] unhandled error:', err);
    return c.json({ code: 'internal_error', message: 'internal server error' }, 500);
  });

  app.get('/healthz', (c) => c.json({ status: 'ok' }));

  // —— 自留认证端点（先注册；官方 catch-all 在最后）——
  app.route('/api/auth', createAuthRoutes());
  // Device Flow（T30-T33 旧契约；T5 按官方两段式重写）
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
      audit: deps.audit,
    }),
  );
  // OIDC 授权码流（T24/T25；authorize/callback 为访客端点——无 requireAuth，走独立 state cookie）
  app.route(
    '/api/auth/oidc',
    createOidcRoutes({
      auth,
      db: deps.db,
      cookieSecure: deps.cookieSecure,
      audit: deps.audit,
    }),
  );

  // —— 官方端点（catch-all：登录/登出/注册/会话/设备流/令牌签发等）——
  // 登出审计由本包装层记（官方 `hooks.after` 在 sign-out 路径取不到会话——
  // 会话行已删；此处「先读会话 → 官方处理 → 补审计」，行为确定可测）
  app.all('/api/auth/*', async (c) => {
    const isSignOut = c.req.path === '/api/auth/sign-out';
    const before = isSignOut ? await auth.api.getSession({ headers: c.req.raw.headers }) : null;
    const response = await auth.handler(c.req.raw);
    if (isSignOut && before && response.ok) {
      const meta = auditMetaFromHeaders(c.req.raw.headers);
      await deps.audit({
        ...meta,
        actorId: before.user.id,
        action: AUDIT_ACTIONS.logout,
        targetType: 'user',
        targetId: before.user.id,
      });
    }
    return response;
  });

  app.route(
    '/api/assets',
    createAssetRoutes({
      db: deps.db,
      audit: deps.audit,
      storage: deps.storage,
      uploadRateLimiter:
        deps.uploadRateLimiter ??
        new InMemoryRateLimiter(UPLOAD_RATE_LIMIT.windowMs, UPLOAD_RATE_LIMIT.max),
      downloadRateLimiter:
        // env 可配（design §7.2 G9——默认 60/分·IP）
        new InMemoryRateLimiter(
          getEnv().DOWNLOAD_RATE_LIMIT_WINDOW_MS,
          getEnv().DOWNLOAD_RATE_LIMIT_MAX,
        ),
    }),
  );
  app.route('/api/tokens', createTokenRoutes({ db: deps.db, audit: deps.audit }));
  app.route('/api/reviews', createReviewRoutes({ db: deps.db, audit: deps.audit }));
  app.route('/api/labels', createLabelRoutes({ db: deps.db, audit: deps.audit }));
  app.route('/api/stats', createStatsRoutes({ db: deps.db }));
  app.route('/api/audit', createAuditRoutes({ db: deps.db }));

  return app;
}
