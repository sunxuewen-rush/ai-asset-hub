import { Hono } from 'hono';
import { ACCOUNT_ROLE } from '../auth/roles.js';

/**
 * 认证薄层路由（M4b-pre design §4.1 · R14）——官方 handler 之外**唯一**自留的认证端点。
 *
 * `GET /api/auth/me`：**对外契约形状逐字不变**（design §8「保持不变」表）——
 * `{ user: { id, displayName }, role }`，`role` 仍为数值 4 档（`ROLE_LEVEL` 映射单点）。
 * 前端与既有断言因此零改动；会话来自官方 `getSession`（中间件已注入 principal），
 * 档位取自官方 `user.role` 文本经 `RbacService`。
 *
 * 不做旧登出别名：官方 `POST /api/auth/sign-out` 是唯一登出端点（design §4.1）。
 */
export function createAuthRoutes(): Hono {
  const app = new Hono();

  app.get('/me', async (c) => {
    const principal = c.get('principal');
    if (!principal) {
      return c.json({ code: 'auth.session_expired', message: 'not authenticated' }, 401);
    }
    const rbac = c.get('rbac');
    const role = (rbac ? await rbac.roleOf(principal.userId) : null) ?? ACCOUNT_ROLE.GUEST;
    return c.json({
      user: { id: principal.userId, displayName: principal.displayName },
      role,
    });
  });

  return app;
}
