import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { ACCOUNT_ROLE } from '../auth/roles.js';
import type { Db } from '../db/client.js';
import { account } from '../db/schema/index.js';

/**
 * 认证薄层路由（M4b-pre design §4.1 · R14）——官方 handler 之外**唯一**自留的认证端点。
 *
 * `GET /api/auth/me`：**M4c-2 T5 起出参 +1 只读字段 `hasLocalPassword`**（原「形状逐字不变」口径随之
 * **局部放宽**；依据 = 批 design §4.5 R21「目录账号入口层拒绝」——前端需据此决定是否显示改密入口）。
 * 其余 `{ user: { id, displayName }, role }` 形状与 `role` 数值 4 档语义**逐字不变**。
 * 前端与既有断言因此零改动；会话来自官方 `getSession`（中间件已注入 principal），
 * 档位取自官方 `user.role` 文本经 `RbacService`。
 *
 * 不做旧登出别名：官方 `POST /api/auth/sign-out` 是唯一登出端点（design §4.1）。
 */
export interface AuthRoutesDeps {
  db: Db;
}

export function createAuthRoutes({ db }: AuthRoutesDeps): Hono {
  const app = new Hono();

  app.get('/me', async (c) => {
    const principal = c.get('principal');
    if (!principal) {
      return c.json({ code: 'auth.session_expired', message: 'not authenticated' }, 401);
    }
    const rbac = c.get('rbac');
    const role = (rbac ? await rbac.roleOf(principal.userId) : null) ?? ACCOUNT_ROLE.GUEST;
    /**
     * **M4c-2 T5**：本地口令标志（批 design §4.5 R21 入口层拒绝的判据）。
     * 判定 = 凭据行（`providerId='credential'` · `accountId=user.id`）的 `password` **不以 `ldap:` 开头**。
     * 目录账号的凭据委派行 `password = 'ldap:<工号>'`（批 design §5.1）⇒ `false` ⇒ 前端不显示改密入口。
     */
    const [cred] = await db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.providerId, 'credential'), eq(account.accountId, principal.userId)))
      .limit(1);
    const secret = cred?.password ?? null;
    const hasLocalPassword = secret !== null && !secret.startsWith('ldap:');
    return c.json({
      user: { id: principal.userId, displayName: principal.displayName },
      role,
      hasLocalPassword,
    });
  });

  return app;
}
