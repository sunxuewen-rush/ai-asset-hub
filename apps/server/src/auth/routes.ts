import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuditWriter } from '../audit/audit.js';
import { AUDIT_ACTIONS } from '../audit/audit.js';
import type { AuthService, LoginInput } from './auth-service.js';
import { AuthError } from './errors.js';
import type { RateLimiter } from './rate-limit.js';
import { ACCOUNT_ROLE } from './rbac.js';
import type { SessionManager } from './session.js';
import { attachSessionCookie, revokeSession } from './session-middleware.js';
import { PASSWORD_MIN_LENGTH, USERNAME_MAX, USERNAME_PATTERN } from './users.js';

/** /api/auth 路由组（06 §5.3 前缀 /api；07 §4 结构化 {code,message}） */
export interface AuthRoutesDeps {
  authService: AuthService;
  sessions: SessionManager;
  audit: AuditWriter;
  rateLimiter: RateLimiter;
  registrationEnabled: boolean;
  sessionTtlHours: number;
  cookieSecure: boolean;
}

const registerBodySchema = z.object({
  username: z.string().trim().min(1).max(USERNAME_MAX).regex(USERNAME_PATTERN),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  displayName: z.string().trim().max(128).optional(),
  email: z.string().trim().email().optional(),
});

const loginBodySchema = z.object({
  username: z.string().min(1).max(256),
  password: z.string().max(1024),
});

export function createAuthRoutes(deps: AuthRoutesDeps): Hono {
  const app = new Hono();
  const cookie = {
    secure: deps.cookieSecure,
    sameSite: 'lax' as const,
    maxAgeSec: deps.sessionTtlHours * 60 * 60, // SESSION_TTL_HOURS 对齐（P2）
  };

  // POST /api/auth/register —— 本地注册（注册开关；成功即建会话）
  app.post('/register', async (c) => {
    const body = registerBodySchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json({ code: 'invalid_request', message: 'invalid request body' }, 400);
    }
    const ctx = c.get('requestContext');
    const { username, password, displayName, email } = body.data;
    try {
      const user = await deps.authService.register({
        username,
        password,
        displayName,
        email,
        ...ctx,
      });
      const sessionId = await deps.sessions.createSession(user.id, user.displayName);
      attachSessionCookie(c, sessionId, cookie);
      return c.json(
        { user: { id: user.id, displayName: user.displayName, email: user.email ?? null } },
        201,
      );
    } catch (err) {
      return handleAuthError(c, err);
    }
  });

  // POST /api/auth/login —— 本地 + LDAP 编排
  app.post('/login', async (c) => {
    const body = loginBodySchema.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json({ code: 'invalid_request', message: 'invalid request body' }, 400);
    }
    const ctx = c.get('requestContext');
    const { username, password } = body.data;
    const key = `${username}|${ctx.clientIp}`;
    const limit = deps.rateLimiter.hit(key);
    if (!limit.allowed) {
      c.header('retry-after', String(limit.retryAfterSec));
      return c.json({ code: 'auth.rate_limited', message: 'too many login attempts' }, 429);
    }
    try {
      const input: LoginInput = { username, password, ...ctx };
      const user = await deps.authService.login(input);
      const sessionId = await deps.sessions.createSession(user.id, user.displayName);
      attachSessionCookie(c, sessionId, cookie);
      return c.json({ user: { id: user.id, displayName: user.displayName } }, 200);
    } catch (err) {
      return handleAuthError(c, err);
    }
  });

  // POST /api/auth/logout —— 登出（幂等）
  app.post('/logout', async (c) => {
    const principal = c.get('principal');
    const ctx = c.get('requestContext');
    await revokeSession(c, deps.sessions);
    if (principal) {
      await deps.audit({
        ...ctx,
        actorId: principal.userId,
        action: AUDIT_ACTIONS.logout,
        targetType: 'user',
        targetId: principal.userId,
      });
    }
    return c.body(null, 204);
  });

  // GET /api/auth/me —— 当前用户（M4-pre design §8：平台角色改返 `role` 单值 4 档）
  app.get('/me', async (c) => {
    const principal = c.get('principal');
    if (!principal) {
      return c.json({ code: 'auth.session_expired', message: 'not authenticated' }, 401);
    }
    const role = (await c.get('rbac')!.roleOf(principal.userId)) ?? ACCOUNT_ROLE.GUEST;
    return c.json({ user: { id: principal.userId, displayName: principal.displayName }, role });
  });

  return app;
}

function handleAuthError(c: Context, err: unknown): Response {
  if (err instanceof AuthError) {
    return c.json(
      { code: err.code, message: err.message },
      err.status as 400 | 401 | 403 | 409 | 429,
    );
  }
  throw err;
}

// register 由 AuthService 承载（含审计）——补在该处类型上
export type { AuthRoutesDeps as AuthRoutesConfig };
