import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { verifyApiKey } from '../auth/api-keys.js';
import type { AihAuth } from '../auth/better-auth.js';
import type { Db } from '../db/client.js';
import { user } from '../db/schema/index.js';
import type { Principal } from './auth-middleware.js';

/**
 * Bearer Token 认证中间件（T17，05 §5 API Token 通道）。
 *
 * M4b-pre T4（令牌面切流）：查找/哈希/校验/hash 全交官方 api-key 插件（服务端直呼
 * `verifyApiKey`，**serverOnly** 端点 ⇒ 不带 headers，官方按 `key` 哈希查表），本中间件只保留
 * 项目语义：
 * - `Authorization: Bearer <明文>` 显式凭证通道，以 Bearer 为准（会话 cookie 被忽略——
 *   无效 Bearer 也不降级回 cookie，防凭证混淆/降级）
 * - 无 Bearer 头 → 不介入（回退官方会话中间件）
 * - 无效/未知/吊销（官方 `KEY_DISABLED`）/过期（官方 `KEY_EXPIRED`，**官方同时删该行**）→ 匿名
 *   （401 由 requireAuth 判定，本中间件不拒绝请求——旧口径不变）
 * - 账号面：`status !== 'ACTIVE'`（DISABLED/PENDING）→ 匿名拒（05 §4.1；官方 verify 不看该列）
 * - scope 交集：官方 `permissions`（`{asset:['publish']}`）→ scope 码集合；`NULL` = 全量
 *   （等价旧 `''`/`'cli'` 语义，M1 零破坏）
 */

declare module 'hono' {
  interface ContextVariableMap {
    /** Bearer 头存在即设（有效与否都设）——session/origin 守卫凭此跳过 cookie 通道 */
    authVia?: 'bearer';
    /** 有效令牌的行 id（官方 `apikey.id`，文本；审计关联用） */
    tokenId?: string;
    /** token scope 交集面（null = 全量；Set = 权限码白名单——T15） */
    tokenScopes?: Set<string> | null;
  }
}

export function tokenAuthMiddleware(db: Db, auth: AihAuth) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      await next();
      return;
    }
    // Bearer 显式 → 锁定通道（即使无效也不回退 session cookie）
    c.set('authVia', 'bearer');

    const plain = header.slice('Bearer '.length).trim();
    const verified = plain.length > 0 ? await verifyApiKey(auth, plain) : null;
    if (!verified) {
      await next();
      return;
    }
    const [owner] = await db
      .select({ displayName: user.name, status: user.status })
      .from(user)
      .where(eq(user.id, verified.userId));
    // 账号不存在/非 ACTIVE（DISABLED/PENDING）→ 匿名拒
    if (owner?.status !== 'ACTIVE') {
      await next();
      return;
    }
    const principal: Principal = { userId: verified.userId, displayName: owner.displayName };
    c.set('principal', principal);
    c.set('tokenId', verified.keyId);
    c.set('tokenScopes', verified.scopes);
    await next();
  };
}
