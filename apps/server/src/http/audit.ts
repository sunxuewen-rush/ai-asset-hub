import { Hono } from 'hono';
import { z } from 'zod';
import { queryAudit } from '../audit/query.js';
import { PERMISSIONS } from '../auth/permissions.js';
import type { Db } from '../db/client.js';
import { requirePermission } from './auth-middleware.js';

/**
 * /api/audit 路由组（T20，05 §6.4 audit:read：AUDITOR/SUPER_ADMIN 浏览审计日志）。
 * 页码分页（R9：审计浏览低频，limit/offset 简单优先）+ 过滤面（S4）与 T19 query 对齐。
 */

export interface AuditRoutesDeps {
  db: Db;
}

const AUDIT_FILTER_MAX = 256;

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  action: z.string().trim().min(1).max(64).optional(),
  targetType: z.string().trim().min(1).max(64).optional(),
  targetId: z.string().trim().min(1).max(128).optional(),
  actorId: z.string().trim().min(1).max(AUDIT_FILTER_MAX).optional(),
  requestId: z.string().trim().min(1).max(64).optional(),
  clientIp: z.string().trim().min(1).max(64).optional(),
  /** ISO8601 带时区（例 2026-09-07T00:00:00Z） */
  from: z
    .string()
    .datetime()
    .transform((v) => new Date(v))
    .optional(),
  to: z
    .string()
    .datetime()
    .transform((v) => new Date(v))
    .optional(),
});

export function createAuditRoutes(deps: AuditRoutesDeps): Hono {
  const { db } = deps;
  const app = new Hono();
  app.use('*', requirePermission(PERMISSIONS.auditRead));

  app.get('/', async (c) => {
    const parsed = auditQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { limit, offset, ...filters } = parsed.data;
    const result = await queryAudit(db, { limit, offset, ...filters });
    return c.json({ items: result.items, total: result.total, limit, offset });
  });

  return app;
}
