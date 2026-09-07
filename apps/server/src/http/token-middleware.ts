import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import type { Principal } from '../auth/session.js';
import { hashToken } from '../auth/tokens.js';
import type { Db } from '../db/client.js';
import { apiToken, userAccount } from '../db/schema/index.js';

/**
 * Bearer Token 认证中间件（T17，05 §5 API Token 通道）：
 * `Authorization: Bearer <plain>` → sha256 → api_token 匹配（未吊销/未过期）→
 * join user_account（ACTIVE）→ 注入 principal + tokenId。
 *
 * 与 sessionMiddleware 并存（装配序：token → session）：
 * - 请求带 Authorization: Bearer → 显式凭证通道，以 Bearer 为准（会话 cookie 被忽略——
 *   无效 Bearer 也不降级回 cookie，防凭证混淆/降级）
 * - 无 Bearer 头 → 回退 session 中间件
 * - 无效/未知/吊销/过期 → 匿名（401 由 requireAuth 判定，本中间件不拒绝请求）
 */

declare module 'hono' {
  interface ContextVariableMap {
    /** Bearer 头存在即设（有效与否都设）——session/csrf 凭此跳过 cookie 通道 */
    authVia?: 'bearer';
    /** 有效 token 的行 id（csrf 免验凭证通道 / 未来审计关联） */
    tokenId?: number;
  }
}

export function tokenAuthMiddleware(db: Db) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      await next();
      return;
    }
    // Bearer 显式 → 锁定通道（即使无效也不回退 session cookie）
    c.set('authVia', 'bearer');

    const plain = header.slice('Bearer '.length).trim();
    const [token] = await db
      .select({
        id: apiToken.id,
        userId: apiToken.userId,
        expiresAt: apiToken.expiresAt,
        revokedAt: apiToken.revokedAt,
      })
      .from(apiToken)
      .where(eq(apiToken.tokenHash, hashToken(plain)));
    if (!token || token.revokedAt) {
      await next();
      return;
    }
    if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
      await next();
      return;
    }
    const [user] = await db
      .select({ displayName: userAccount.displayName, status: userAccount.status })
      .from(userAccount)
      .where(eq(userAccount.id, token.userId));
    // 账号不存在/非 ACTIVE（DISABLED/PENDING）→ 匿名拒
    if (user?.status !== 'ACTIVE') {
      await next();
      return;
    }
    const principal: Principal = { userId: token.userId, displayName: user.displayName };
    c.set('principal', principal);
    c.set('tokenId', token.id);
    await next();
  };
}
