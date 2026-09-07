import { slugSchema } from '@ai-asset-hub/protocol';
import { and, count, eq, inArray, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { namespace, namespaceMember, namespaceTypeSchema } from '../db/schema/index.js';
import { requireAuth, requirePlatformRole } from './auth-middleware.js';

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

/** POST body（T3；slug 复用 protocol slugSchema 单源） */
const createBodySchema = z.object({
  slug: slugSchema,
  displayName: z.string().trim().min(1).max(128),
  description: z.string().trim().max(2000).optional(),
  type: namespaceTypeSchema.default('TEAM'),
});

/** PG 唯一约束冲突码（slug 重复） */
const PG_UNIQUE_VIOLATION = '23505';

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

  // POST /api/namespaces（T3：R2 平台角色建空间——TEAM 需 ASSET_ADMIN+；GLOBAL 仅 SUPER_ADMIN）
  app.post('/', requireAuth(), requirePlatformRole(['ASSET_ADMIN']), async (c) => {
    const principal = c.get('principal')!;
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = createBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { slug, displayName, description, type } = parsed.data;

    if (type === 'GLOBAL') {
      // R2：GLOBAL 仅 SUPER_ADMIN（requirePlatformRole 只放行 ASSET_ADMIN+，此处收紧）
      const rbac = c.get('rbac')!;
      const roles = await rbac.platformRolesOf(principal.userId);
      if (!roles.includes('SUPER_ADMIN')) {
        return c.json({ code: 'auth.forbidden', message: 'auth.forbidden' }, 403);
      }
    }

    try {
      // 事务：空间行 + OWNER 成员行（05 §6.2：OWNER=创建者）
      const ns = await deps.db.transaction(async (tx) => {
        const rows = await tx
          .insert(namespace)
          .values({
            slug,
            displayName,
            description: description ?? null,
            type,
            createdBy: principal.userId,
          })
          .returning({
            id: namespace.id,
            slug: namespace.slug,
            displayName: namespace.displayName,
            description: namespace.description,
            type: namespace.type,
            status: namespace.status,
            createdAt: namespace.createdAt,
          });
        const row = rows[0];
        if (!row) throw new Error('namespace insert returned no row');
        await tx
          .insert(namespaceMember)
          .values({ namespaceId: row.id, userId: principal.userId, role: 'OWNER' });
        return row;
      });
      return c.json(
        {
          namespace: {
            id: ns.id,
            slug: ns.slug,
            displayName: ns.displayName,
            description: ns.description,
            type: ns.type,
            status: ns.status,
            memberCount: 1,
            myRole: 'OWNER',
            createdAt: ns.createdAt.toISOString(),
          },
        },
        201,
      );
    } catch (err) {
      // drizzle 包装 pg 错误（query/params/cause）——真实 PG code 在 cause 层
      const pgCode =
        (err as { cause?: { code?: string } }).cause?.code ?? (err as { code?: string }).code;
      if (pgCode === PG_UNIQUE_VIOLATION) {
        return c.json({ code: 'namespace.slug_taken', message: 'namespace.slug_taken' }, 409);
      }
      throw err;
    }
  });

  return app;
}
