import { Hono } from 'hono';
import { z } from 'zod';
import { generateTokenSecret, hashToken } from '../auth/tokens.js';
import type { Db } from '../db/client.js';
import { apiToken } from '../db/schema/index.js';
import { requireAuth } from './auth-middleware.js';

/**
 * /api/tokens 路由组（T14-T16，板块 C；05 §5 API Token——平台通用凭证）：
 * 任何 ACTIVE 用户签发本人凭证，无需权限码（签发自己 token 天然授权）。
 * 安全面（P6）：明文只在签发响应出现一次；落库仅 sha256（T13），不写日志/审计 detail。
 * 字段契约以 08 §3 为准：api_token = token_hash/scope/expires_at/revoked_at（无 label 列）。
 */

export interface TokenRoutesDeps {
  db: Db;
}

const DAY_MS = 86_400_000;

/** POST body（T14：省略 expiresInDays = 永不过期 expiresAt null；1-3650 天，超限 400） */
const issueBodySchema = z.object({
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

export function createTokenRoutes(deps: TokenRoutesDeps): Hono {
  const { db } = deps;
  const app = new Hono();
  app.use('*', requireAuth());

  // POST /api/tokens（T14：签发明文一次 + 哈希落库）
  app.post('/', async (c) => {
    const principal = c.get('principal');
    // requireAuth() 已保证 principal（组级中间件）；守卫仅为类型窄化
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    let payload: unknown;
    try {
      const text = await c.req.text();
      payload = text.length === 0 ? {} : JSON.parse(text);
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = issueBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const expiresAt =
      parsed.data.expiresInDays === undefined
        ? null
        : new Date(Date.now() + parsed.data.expiresInDays * DAY_MS);
    const plain = generateTokenSecret();
    const [row] = await db
      .insert(apiToken)
      .values({
        userId: principal.userId,
        tokenHash: hashToken(plain),
        // scope 默认空串 = 全量（05 §5：可设 scope/到期；M1 不做 scope 过滤）
        scope: '',
        expiresAt,
      })
      .returning({ id: apiToken.id });
    if (!row) throw new Error('api token insert returned no row');
    return c.json({ id: row.id, token: plain, expiresAt }, 201);
  });

  return app;
}
