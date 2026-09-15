import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { AssetError } from './assets/errors.js';
import { AUDIT_ACTIONS, type AuditWriter, auditMetaFromHeaders } from './audit/audit.js';
import { type AihAuth, createAuth } from './auth/better-auth.js';
import { AuthError } from './auth/errors.js';
import type { LdapChannel } from './auth/ldap.js';
import { InMemoryRateLimiter, type RateLimiter } from './auth/rate-limit.js';
import { RbacService } from './auth/rbac.js';
import { getEnv } from './config/env.js';
import type { Db } from './db/client.js';
import { session } from './db/schema/index.js';
import { createAssetRoutes, UPLOAD_RATE_LIMIT } from './http/assets.js';
import { createAuditRoutes } from './http/audit.js';
import { officialSessionMiddleware, rbacContext } from './http/auth-middleware.js';
import { createAuthRoutes } from './http/auth-routes.js';
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
/**
 * 读取设备批准/拒绝请求体里的 `userCode`（审计目标；官方端点契约为 camelCase `userCode`）。
 * 解析失败不阻断请求（审计非关键路径）。
 */
async function readUserCode(req: Request): Promise<string | null> {
  try {
    const body = (await req.clone().json()) as { userCode?: unknown };
    return typeof body?.userCode === 'string' && body.userCode.length > 0 ? body.userCode : null;
  } catch {
    return null;
  }
}

/**
 * 设备令牌签发的归属用户：响应体 `access_token` = 官方会话 token（`session.token` 列）。
 * 仅用于审计 actorId（明文不落审计、不落日志）。
 */
async function sessionOwnerOfResponse(db: Db, res: Response): Promise<string | null> {
  try {
    const body = (await res.clone().json()) as { access_token?: unknown };
    const token = typeof body?.access_token === 'string' ? body.access_token : null;
    if (!token) return null;
    const [row] = await db
      .select({ userId: session.userId })
      .from(session)
      .where(eq(session.token, token));
    return row?.userId ?? null;
  } catch {
    return null;
  }
}

export interface AppDeps {
  db: Db;
  audit: AuditWriter;
  rateLimiter: RateLimiter;
  /** 上传限流（T13——独立实例：UPLOAD_RATE_LIMIT 常量装配） */
  uploadRateLimiter?: RateLimiter;
  ldap: LdapChannel | null;
  storage: ObjectStorage;
  cookieSecure: boolean;
  /** 官方实例（可选注入；缺省按本 deps 构造——含 LDAP 通道/审计/登录限流） */
  auth?: AihAuth;
}

export function createApp(deps: AppDeps): Hono {
  const rbac = new RbacService(deps.db);
  const auth =
    deps.auth ?? createAuth({ ldap: deps.ldap, audit: deps.audit, rateLimiter: deps.rateLimiter });

  const app = new Hono();
  app.use('*', requestContextMiddleware());
  app.use('*', rbacContext(rbac));
  // 认证装配序（T17）：Bearer 显式优先 → 无则官方 session cookie（token → session）
  app.use('/api/*', tokenAuthMiddleware(deps.db, auth));
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
  // Device Flow：M4b-pre T5 起**整体交官方**（`deviceAuthorization` 插件：/device/code · /device · /device/approve ·
  // /device/deny · /device/token），自研路由与内存 pending 存储已删除
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
  // 审计由本包装层补记（官方端点无业务钩子；统一「先读必要上下文 → 官方处理 → 成功即补审计」，
  // 行为确定可测）：
  // - `sign-out`：官方 `hooks.after` 取不到会话（会话行已先删，实测）⇒ 事前读会话
  // - `device/approve` / `device/deny`：actor = 事前会话；目标 = 请求体的 `userCode`（短码，非一次性密钥）
  // - `device/token`：匿名轮询 ⇒ 事后以响应体 `access_token` 反查会话归属（明文不落审计）
  app.all('/api/auth/*', async (c) => {
    const path = c.req.path;
    const isSignOut = path === '/api/auth/sign-out';
    const isDeviceApprove = path === '/api/auth/device/approve';
    const isDeviceDeny = path === '/api/auth/device/deny';
    const needsSession = isSignOut || isDeviceApprove || isDeviceDeny;
    const before = needsSession ? await auth.api.getSession({ headers: c.req.raw.headers }) : null;
    const userCode = isDeviceApprove || isDeviceDeny ? await readUserCode(c.req.raw) : null;
    const response = await auth.handler(c.req.raw);
    if (response.ok && before && isSignOut) {
      const meta = auditMetaFromHeaders(c.req.raw.headers);
      await deps.audit({
        ...meta,
        actorId: before.user.id,
        action: AUDIT_ACTIONS.logout,
        targetType: 'user',
        targetId: before.user.id,
      });
    } else if (response.ok && before && (isDeviceApprove || isDeviceDeny)) {
      const meta = auditMetaFromHeaders(c.req.raw.headers);
      await deps.audit({
        ...meta,
        actorId: before.user.id,
        action: isDeviceApprove ? AUDIT_ACTIONS.deviceApprove : AUDIT_ACTIONS.deviceDeny,
        targetType: 'device_code',
        ...(userCode ? { targetId: userCode } : {}),
      });
    } else if (response.ok && path === '/api/auth/device/token') {
      const owner = await sessionOwnerOfResponse(deps.db, response);
      if (owner) {
        const meta = auditMetaFromHeaders(c.req.raw.headers);
        await deps.audit({
          ...meta,
          actorId: owner,
          action: AUDIT_ACTIONS.deviceTokenIssued,
          targetType: 'session',
        });
      }
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
  app.route('/api/tokens', createTokenRoutes({ db: deps.db, auth, audit: deps.audit }));
  app.route('/api/reviews', createReviewRoutes({ db: deps.db, audit: deps.audit }));
  app.route('/api/labels', createLabelRoutes({ db: deps.db, audit: deps.audit }));
  app.route('/api/stats', createStatsRoutes({ db: deps.db }));
  app.route('/api/audit', createAuditRoutes({ db: deps.db }));

  return app;
}
