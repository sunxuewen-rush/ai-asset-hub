import { slugSchema } from '@ai-asset-hub/protocol';
import { and, count, eq, inArray, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { AuthError } from '../auth/errors.js';
import { PERMISSIONS } from '../auth/permissions.js';
import type { AuditWriter } from '../audit/audit.js';
import type { Db } from '../db/client.js';
import {
  namespace,
  namespaceMember,
  namespaceTypeSchema,
  userAccount,
} from '../db/schema/index.js';
import { requireAuth, requirePlatformRole } from './auth-middleware.js';

/**
 * /api/namespaces 路由组（T2-T7，板块 A；05 §6.2/§6.4）：
 * 可见性：ACTIVE 全量可见 + 非 ACTIVE 仅成员（05 §6.2：ARCHIVED 归档对外不可见——成员仍可管理面进入）。
 * 详情/写操作对不可见空间统一 404（防枚举），可见后按权限判定 403。
 */

export interface NamespaceRoutesDeps {
  db: Db;
  /** 审计写入器（T16 起：namespace 治理动作埋点——transfer_ownership） */
  audit?: AuditWriter;
}

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: namespaceTypeSchema.optional(),
});

/** 转让 body（T16——目标须为空间成员，发起后事务双角色变更） */
const transferBodySchema = z.object({ newOwnerId: z.string().min(1).max(128) });

/** POST body（T3；slug 复用 protocol slugSchema 单源） */
const createBodySchema = z.object({
  slug: slugSchema,
  displayName: z.string().trim().min(1).max(128),
  description: z.string().trim().max(2000).optional(),
  type: namespaceTypeSchema.default('TEAM'),
});

/** PATCH body（T4：字段级更新；description 传 null 清除） */
const updateBodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(128).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.displayName !== undefined || v.description !== undefined, {
    message: 'nothing to update',
  });

/** PATCH /:id/status body（T5：状态治理，05 §6.2 三态） */
const statusBodySchema = z.object({
  status: z.enum(['ACTIVE', 'FROZEN', 'ARCHIVED']),
});

/** POST /:id/members body（T6：成员添加；role 放宽含 OWNER 以返回专用 transfer_deferred 码——转让后置 M2） */
const addMemberBodySchema = z.object({
  userId: z.string().min(1).max(128),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

/** PG 唯一约束冲突码（slug 重复） */
const PG_UNIQUE_VIOLATION = '23505';

const namespaceItemColumns = {
  id: namespace.id,
  slug: namespace.slug,
  displayName: namespace.displayName,
  description: namespace.description,
  type: namespace.type,
  status: namespace.status,
  createdAt: namespace.createdAt,
} as const;

type NamespaceRow = {
  id: number;
  slug: string;
  displayName: string;
  description: string | null;
  type: string;
  status: string;
  createdAt: Date;
};

/** 统一响应形状（列表/详情/创建/更新共用） */
function namespaceItem(row: NamespaceRow, memberCount: number, myRole: string | null) {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    description: row.description,
    type: row.type,
    status: row.status,
    memberCount,
    myRole,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 当前用户成员的空间 id 子查询（可见性共用） */
function myNamespaceIdsSubquery(db: Db, userId: string) {
  return db
    .select({ id: namespaceMember.namespaceId })
    .from(namespaceMember)
    .where(eq(namespaceMember.userId, userId));
}

/** 可见空间（ACTIVE 全量 ∪ 我成员的非 ACTIVE） */
function visibleWhere(db: Db, userId: string) {
  return or(
    eq(namespace.status, 'ACTIVE'),
    inArray(namespace.id, myNamespaceIdsSubquery(db, userId)),
  );
}

/** 成员摘要（详情/更新响应用；列表走页内批量聚合保持无 N+1） */
async function memberSummary(
  db: Db,
  namespaceId: number,
  viewerId: string,
): Promise<{ count: number; myRole: string | null }> {
  const rows = await db
    .select({ userId: namespaceMember.userId, role: namespaceMember.role })
    .from(namespaceMember)
    .where(eq(namespaceMember.namespaceId, namespaceId));
  let count = 0;
  let myRole: string | null = null;
  for (const r of rows) {
    count += 1;
    if (r.userId === viewerId) myRole = r.role;
  }
  return { count, myRole };
}

/** id path 参数解析（bigserial 数字） */
function parseNamespaceId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const parsed = z.coerce.number().int().positive().safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function createNamespaceRoutes(deps: NamespaceRoutesDeps): Hono {
  const app = new Hono();
  const { db } = deps;

  // GET /api/namespaces（T2：分页 + type 过滤 + memberCount + myRole）
  app.get('/', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const parsed = listQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { limit, offset, type: typeFilter } = parsed.data;

    const where = typeFilter
      ? and(visibleWhere(db, principal.userId), eq(namespace.type, typeFilter))
      : visibleWhere(db, principal.userId);

    const [totalRow] = await db.select({ total: count() }).from(namespace).where(where);
    const rows = await db
      .select(namespaceItemColumns)
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

    const items = rows.map((r) =>
      namespaceItem(r, memberCounts.get(r.id) ?? 0, myRoles.get(r.id) ?? null),
    );

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
          .returning(namespaceItemColumns);
        const row = rows[0];
        if (!row) throw new Error('namespace insert returned no row');
        await tx
          .insert(namespaceMember)
          .values({ namespaceId: row.id, userId: principal.userId, role: 'OWNER' });
        return row;
      });
      return c.json({ namespace: namespaceItem(ns, 1, 'OWNER') }, 201);
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

  // GET /api/namespaces/:id（T4：详情；ACTIVE 全可见 + 非 ACTIVE 成员/超管，其余 404）
  app.get('/:id', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const id = parseNamespaceId(c.req.param('id'));
    if (id === null) return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    const rows = await db
      .select(namespaceItemColumns)
      .from(namespace)
      .where(and(eq(namespace.id, id), visibleWhere(db, principal.userId)));
    const row = rows[0];
    if (!row) return c.json({ code: 'namespace.not_found', message: 'namespace.not_found' }, 404);
    const summary = await memberSummary(db, id, principal.userId);
    return c.json({ namespace: namespaceItem(row, summary.count, summary.myRole) });
  });

  // PATCH /api/namespaces/:id（T4：改名/描述；namespace:manage = 空间 OWNER/ADMIN 或超管；状态列走 T5）
  app.patch('/:id', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const id = parseNamespaceId(c.req.param('id'));
    if (id === null) return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = updateBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const rows = await db
      .select(namespaceItemColumns)
      .from(namespace)
      .where(and(eq(namespace.id, id), visibleWhere(db, principal.userId)));
    const existing = rows[0];
    if (!existing) {
      return c.json({ code: 'namespace.not_found', message: 'namespace.not_found' }, 404);
    }

    // 权限：namespace:manage（空间 OWNER/ADMIN；SUPER_ADMIN 短路）——FROZEN 拒写由 rbac WRITE_PERMISSIONS 覆盖
    const rbac = c.get('rbac')!;
    const allowed = await rbac.can(principal.userId, PERMISSIONS.namespaceManage, {
      namespaceId: id,
    });
    if (!allowed) throw new AuthError('auth.forbidden');

    const patch: { displayName?: string; description?: string | null } = {};
    if (parsed.data.displayName !== undefined) patch.displayName = parsed.data.displayName;
    if (parsed.data.description !== undefined) patch.description = parsed.data.description;

    const updated = await db
      .update(namespace)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(namespace.id, id))
      .returning(namespaceItemColumns);
    const row = updated[0]!;
    const summary = await memberSummary(db, id, principal.userId);
    return c.json({ namespace: namespaceItem(row, summary.count, summary.myRole) });
  });

  // PATCH /api/namespaces/:id/status（T5：状态治理——ACTIVE/FROZEN/ARCHIVED，R3 仅 SUPER_ADMIN；
  // 05 §6.2 三态：FROZEN 只读拒写 / ARCHIVED 对外不可见；互转无限制，治理可逆，幂等同态 200）
  app.patch('/:id/status', requireAuth(), requirePlatformRole(['SUPER_ADMIN']), async (c) => {
    const id = parseNamespaceId(c.req.param('id'));
    if (id === null) return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = statusBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const principal = c.get('principal')!;
    const rows = await db.select(namespaceItemColumns).from(namespace).where(eq(namespace.id, id));
    const existing = rows[0];
    if (!existing) {
      return c.json({ code: 'namespace.not_found', message: 'namespace.not_found' }, 404);
    }
    if (existing.status === parsed.data.status) {
      // 幂等同态：返回现状
      const summary = await memberSummary(db, id, principal.userId);
      return c.json({ namespace: namespaceItem(existing, summary.count, summary.myRole) });
    }
    const updated = await db
      .update(namespace)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(namespace.id, id))
      .returning(namespaceItemColumns);
    const row = updated[0]!;
    const summary = await memberSummary(db, id, principal.userId);
    return c.json({ namespace: namespaceItem(row, summary.count, summary.myRole) });
  });

  // GET /api/namespaces/:id/members（T6：成员列表；可见空间可浏览成员，带 displayName）
  app.get('/:id/members', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const id = parseNamespaceId(c.req.param('id'));
    if (id === null) return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    const nsRows = await db
      .select({ id: namespace.id })
      .from(namespace)
      .where(and(eq(namespace.id, id), visibleWhere(db, principal.userId)));
    if (nsRows.length === 0) {
      return c.json({ code: 'namespace.not_found', message: 'namespace.not_found' }, 404);
    }
    const members = await db
      .select({
        userId: namespaceMember.userId,
        role: namespaceMember.role,
        joinedAt: namespaceMember.createdAt,
        displayName: userAccount.displayName,
      })
      .from(namespaceMember)
      .innerJoin(userAccount, eq(namespaceMember.userId, userAccount.id))
      .where(eq(namespaceMember.namespaceId, id))
      .orderBy(userAccount.displayName);
    return c.json({ items: members, total: members.length });
  });

  // POST /api/namespaces/:id/members（T6：添加成员/角色分配链——OWNER 可设 ADMIN/MEMBER，ADMIN 仅 MEMBER，
  // OWNER 不可经添加产生（转让后置 M2）；目标用户须 ACTIVE；防重复）
  app.post('/:id/members', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const id = parseNamespaceId(c.req.param('id'));
    if (id === null) return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = addMemberBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { userId: targetId, role } = parsed.data;

    const rbac = c.get('rbac')!;
    const allowed = await rbac.can(principal.userId, PERMISSIONS.namespaceManage, {
      namespaceId: id,
    });
    if (!allowed) throw new AuthError('auth.forbidden');

    // 目标用户须 ACTIVE（DISABLED/PENDING 不可入空间）
    const targetRows = await db
      .select({ status: userAccount.status })
      .from(userAccount)
      .where(eq(userAccount.id, targetId));
    if (targetRows[0]?.status !== 'ACTIVE') {
      return c.json(
        { code: 'namespace.user_not_active', message: 'namespace.user_not_active' },
        400,
      );
    }

    // 角色分配链（05 §6.4：空间角色管理权——OWNER/ADMIN 分级）
    const callerMember = await db
      .select({ role: namespaceMember.role })
      .from(namespaceMember)
      .where(
        and(eq(namespaceMember.namespaceId, id), eq(namespaceMember.userId, principal.userId)),
      );
    const callerRole = callerMember[0]?.role;
    const callerRoles = await rbac.platformRolesOf(principal.userId);
    const isSuperAdmin = callerRoles.includes('SUPER_ADMIN');
    // OWNER 角色不可经添加产生（转让后置 M2；超管亦走此约束——转让端点后置）
    if (parsed.data.role === 'OWNER') {
      return c.json(
        { code: 'namespace.transfer_deferred', message: 'namespace.transfer_deferred' },
        400,
      );
    }
    // ADMIN 仅可设 MEMBER（OWNER 级 = OWNER 角色或 SUPER_ADMIN 可设 ADMIN）
    if (!isSuperAdmin && callerRole === 'ADMIN' && role === 'ADMIN') {
      throw new AuthError('auth.forbidden');
    }

    try {
      const [member] = await db
        .insert(namespaceMember)
        .values({ namespaceId: id, userId: targetId, role })
        .returning({
          userId: namespaceMember.userId,
          role: namespaceMember.role,
          joinedAt: namespaceMember.createdAt,
        });
      return c.json({ member }, 201);
    } catch (err) {
      const pgCode =
        (err as { cause?: { code?: string } }).cause?.code ?? (err as { code?: string }).code;
      if (pgCode === PG_UNIQUE_VIOLATION) {
        return c.json({ code: 'namespace.member_exists', message: 'namespace.member_exists' }, 409);
      }
      throw err;
    }
  });

  // DELETE /api/namespaces/:id/members/:userId（T7：移除成员——OWNER 级可移 ADMIN/MEMBER，
  // ADMIN 仅移 MEMBER（同级不可互删）；OWNER 行不可移除（= 转让，后置 M2）；目标非成员 404）
  app.delete('/:id/members/:userId', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const id = parseNamespaceId(c.req.param('id'));
    if (id === null) return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    const targetId = c.req.param('userId');

    const rbac = c.get('rbac')!;
    const allowed = await rbac.can(principal.userId, PERMISSIONS.namespaceManage, {
      namespaceId: id,
    });
    if (!allowed) throw new AuthError('auth.forbidden');

    const targetRows = await db
      .select({ role: namespaceMember.role })
      .from(namespaceMember)
      .where(and(eq(namespaceMember.namespaceId, id), eq(namespaceMember.userId, targetId ?? '')));
    const target = targetRows[0];
    if (!target) {
      return c.json(
        { code: 'namespace.member_not_found', message: 'namespace.member_not_found' },
        404,
      );
    }
    // OWNER 行不可移除（= 移除持有者，语义等同转让——后置 M2；超管亦走此约束）
    if (target.role === 'OWNER') {
      return c.json(
        { code: 'namespace.transfer_deferred', message: 'namespace.transfer_deferred' },
        400,
      );
    }
    const callerMember = await db
      .select({ role: namespaceMember.role })
      .from(namespaceMember)
      .where(
        and(eq(namespaceMember.namespaceId, id), eq(namespaceMember.userId, principal.userId)),
      );
    const callerRole = callerMember[0]?.role;
    const callerRoles = await rbac.platformRolesOf(principal.userId);
    const isSuperAdmin = callerRoles.includes('SUPER_ADMIN');
    // ADMIN 仅可移 MEMBER（同级 ADMIN 不可互删——对称添加链；自移亦覆盖）
    if (!isSuperAdmin && callerRole === 'ADMIN' && target.role === 'ADMIN') {
      throw new AuthError('auth.forbidden');
    }

    await db
      .delete(namespaceMember)
      .where(and(eq(namespaceMember.namespaceId, id), eq(namespaceMember.userId, targetId ?? '')));
    return c.body(null, 204);
  });

  // POST /api/namespaces/{id}/transfer-ownership（T16；design R3——OWNER 位置转移）
  // 判定：仅当前 OWNER（或 SUPER_ADMIN 治理豁免——05 §6.5 管理面主轴）发起；
  // 目标须为空间现有成员（防转让给陌生人）；事务：newOwner → OWNER、
  // 原 OWNER → ADMIN（防空位——space 恒有管理角色）；审计 namespace.transfer_ownership。
  app.post('/:id/transfer-ownership', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const id = parseNamespaceId(c.req.param('id'));
    if (id === null) return c.json({ code: 'request.invalid', message: 'invalid id' }, 400);
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ code: 'request.invalid', message: 'request body must be valid json' }, 400);
    }
    const parsed = transferBodySchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { newOwnerId } = parsed.data;

    const nsRows = await db.select({ id: namespace.id }).from(namespace).where(eq(namespace.id, id));
    if (!nsRows[0]) return c.json({ code: 'namespace.not_found', message: 'namespace.not_found' }, 404);

    const members = await db
      .select({ userId: namespaceMember.userId, role: namespaceMember.role })
      .from(namespaceMember)
      .where(eq(namespaceMember.namespaceId, id));
    const currentOwner = members.find((m) => m.role === 'OWNER');
    const targetMember = members.find((m) => m.userId === newOwnerId);

    const platformRoles = await c.get('rbac')!.platformRolesOf(principal.userId);
    const isSuperAdmin = platformRoles.includes('SUPER_ADMIN');
    // 仅当前 OWNER 发起（超管治理豁免——05 §6.5：空间管理面无空位兜底）
    if (!isSuperAdmin && principal.userId !== currentOwner?.userId) {
      return c.json({ code: 'auth.forbidden', message: 'auth.forbidden' }, 403);
    }
    if (!targetMember) {
      return c.json(
        { code: 'namespace.transfer_target_not_member', message: 'namespace.transfer_target_not_member' },
        400,
      );
    }
    if (targetMember.role === 'OWNER') {
      return c.json({ code: 'request.invalid', message: 'new owner is already the owner' }, 400);
    }
    const oldOwnerId = currentOwner!.userId;

    await db.transaction(async (tx) => {
      // 防空位：先升新 OWNER，再降旧 OWNER → ADMIN
      await tx
        .update(namespaceMember)
        .set({ role: 'OWNER' })
        .where(and(eq(namespaceMember.namespaceId, id), eq(namespaceMember.userId, newOwnerId)));
      await tx
        .update(namespaceMember)
        .set({ role: 'ADMIN' })
        .where(and(eq(namespaceMember.namespaceId, id), eq(namespaceMember.userId, oldOwnerId)));
    });

    await deps.audit?.({
      actorId: principal.userId,
      action: 'namespace.transfer_ownership',
      targetType: 'namespace',
      targetId: String(id),
      detail: { from: oldOwnerId, to: newOwnerId },
    });
    return c.body(null, 204);
  });

  return app;
}
