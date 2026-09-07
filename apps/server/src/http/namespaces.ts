import { and, count, eq, inArray, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { namespace, namespaceMember, namespaceTypeSchema } from '../db/schema/index.js';
import { requireAuth } from './auth-middleware.js';

/**
 * /api/namespaces 路由组（T2-T7，板块 A；05 §6.2/§6.4）：
 * 可见性：ACTIVE 全量可见 + 非 ACTIVE 仅成员（05 §6.2：ARCHIVED 归档对外不可见——成员仍可管理面进入）。
 */

export interface NamespaceRoutesDeps {
  db: Db;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: namespaceTypeSchema.optional(),
});

export function createNamespaceRoutes(deps: NamespaceRoutesDeps): Hono {
  const app = new Hono();
  const { db } = deps;

  /** 当前用户成员的空间 id 子查询（可见性 + myRole 共用） */
  function myNamespaceIdsSubquery(userId: string) {
    return db
      .select({ id: namespaceMember.namespaceId })
      .from(namespaceMember)
      .where(eq(namespaceMember.userId, userId));
  }

  /** 可见空间（ACTIVE 全量 ∪ 我成员的非 ACTIVE） */
  function visibleWhere(userId: string) {
    return or(
      eq(namespace.status, 'ACTIVE'),
      inArray(namespace.id, myNamespaceIdsSubquery(userId)),
    );
  }

  // GET /api/namespaces（T2：分页 + type 过滤 + memberCount + myRole）
  app.get('/', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const parsed = listQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { limit, offset, type: typeFilter } = parsed.data;

    const where = typeFilter
      ? and(visibleWhere(principal.userId), eq(namespace.type, typeFilter))
      : visibleWhere(principal.userId);

    const [totalRow] = await db.select({ total: count() }).from(namespace).where(where);
    const rows = await db
      .select({
        id: namespace.id,
        slug: namespace.slug,
        displayName: namespace.displayName,
        description: namespace.description,
        type: namespace.type,
        status: namespace.status,
        createdAt: namespace.createdAt,
      })
      .from(namespace)
      .where(where)
      .orderBy(sql`${namespace.createdAt} desc, ${namespace.id} desc`)
      .limit(limit)
      .offset(offset);

    // 聚合：memberCount（分页内空间）与 myRole（当前用户）
    const pageIds = rows.map((r) => r.id);
    const memberCounts = new Map<number, number>();
    const myRoles = new Map<number, string>();
    if (pageIds.length > 0) {
      const memberRows = await db
        .select({
          namespaceId: namespaceMember.namespaceId,
          userId: namespaceMember.userId,
          role: namespaceMember.role,
        })
        .from(namespaceMember)
        .where(inArray(namespaceMember.namespaceId, pageIds));
      for (const m of memberRows) {
        memberCounts.set(m.namespaceId, (memberCounts.get(m.namespaceId) ?? 0) + 1);
        if (m.userId === principal.userId) myRoles.set(m.namespaceId, m.role);
      }
    }

    const items = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      displayName: r.displayName,
      description: r.description,
      type: r.type,
      status: r.status,
      memberCount: memberCounts.get(r.id) ?? 0,
      myRole: myRoles.get(r.id) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    return c.json({ items, total: totalRow?.total ?? 0, limit, offset });
  });

  return app;
}
