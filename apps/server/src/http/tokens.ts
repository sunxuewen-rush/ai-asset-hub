import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { PERMISSIONS } from '../auth/permissions.js';
import { generateTokenSecret, hashToken } from '../auth/tokens.js';
import type { AuditWriter } from '../audit/audit.js';
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
  /** 审计写入器（T17：token.issue/revoke 埋点——明文零落 detail） */
  audit?: AuditWriter;
}

const DAY_MS = 86_400_000;

/** POST body（T14：省略 expiresInDays = 永不过期 expiresAt null；1-3650 天，超限 400；
 *  T15：可选 scope = permission 码白名单（交集收窄——R14；省略 = 空 scope 全量） */
const issueBodySchema = z.object({
  expiresInDays: z.number().int().min(1).max(3650).optional(),
  scope: z.array(z.enum(Object.values(PERMISSIONS) as [string, ...string[]])).max(10).optional(),
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
        // scope 缺省 = 空串 = 全量（05 §5；''/'cli' 认证时全量语义——M1 零破坏）；
        // 显式 scope = permission 码逗号 join（交集收窄——T15 R14 新签发可设）
        scope: parsed.data.scope === undefined ? '' : parsed.data.scope.join(','),
        expiresAt,
      })
      .returning({ id: apiToken.id });
    if (!row) throw new Error('api token insert returned no row');
    // 审计（T17：token.issue——detail 零明文（明文只在签发响应；库中仅哈希））
    await deps.audit?.({
      actorId: principal.userId,
      action: 'token.issue',
      targetType: 'api_token',
      targetId: String(row.id),
      detail: { expiresAt: expiresAt?.toISOString() ?? null },
    });
    return c.json({ id: row.id, token: plain, expiresAt }, 201);
  });

  // GET /api/tokens（T15：仅本人 token 全量——本人量小，分页后置 R9）
  // 标识面说明：库中仅 sha256 不可逆（T13），无法反推明文做掩码；
  // 列表以 id/时间/状态识别，掩码形态只存在于明文持有方（签发响应 → CLI/M4 展示）
  app.get('/', async (c) => {
    const principal = c.get('principal');
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    const rows = await db
      .select({
        id: apiToken.id,
        scope: apiToken.scope,
        expiresAt: apiToken.expiresAt,
        revokedAt: apiToken.revokedAt,
        createdAt: apiToken.createdAt,
      })
      .from(apiToken)
      .where(eq(apiToken.userId, principal.userId))
      .orderBy(desc(apiToken.createdAt));
    return c.json({ items: rows });
  });

  // DELETE /api/tokens/:id（T16：吊销——本人或 SUPER_ADMIN；幂等 204；他人 token 视同 404 防枚举）
  app.delete('/:id', async (c) => {
    const principal = c.get('principal');
    if (!principal) throw new Error('requireAuth guard violated: principal missing');
    const raw = c.req.param('id');
    if (!/^\d+$/.test(raw)) {
      return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    }
    const id = Number(raw);
    const [token] = await db
      .select({ userId: apiToken.userId, revokedAt: apiToken.revokedAt })
      .from(apiToken)
      .where(eq(apiToken.id, id));
    if (!token) return c.json({ code: 'token.not_found', message: 'token.not_found' }, 404);

    const isOwner = token.userId === principal.userId;
    let isSuperAdmin = false;
    if (!isOwner) {
      const rbac = c.get('rbac');
      if (!rbac) throw new Error('rbac not injected via rbacContext (app assembly error)');
      const roles = await rbac.platformRolesOf(principal.userId);
      isSuperAdmin = roles.includes('SUPER_ADMIN');
    }
    if (!isOwner && !isSuperAdmin) {
      // 防枚举：他人 token 视同不存在
      return c.json({ code: 'token.not_found', message: 'token.not_found' }, 404);
    }
    if (token.revokedAt) return c.body(null, 204); // 幂等：已吊销
    await db.update(apiToken).set({ revokedAt: new Date() }).where(eq(apiToken.id, id));
    // 审计（T17：token.revoke——吊销动作；幂等分支不记）
    await deps.audit?.({
      actorId: principal.userId,
      action: 'token.revoke',
      targetType: 'api_token',
      targetId: String(id),
    });
    return c.body(null, 204);
  });

  return app;
}
