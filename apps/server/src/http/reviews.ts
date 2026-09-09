/**
 * /api/reviews 路由组（M3 design §3.7/§9 R8——审核队列/我的提交/详情/审核动作）。
 * 权限面（design §9 接口表）：
 * - GET /            review:approve 面——平台审核角色（ASSET_ADMIN/SUPER_ADMIN）全平台队列
 *   （namespaceSlug 可选过滤）；空间 ADMIN/OWNER 面须带 namespaceSlug（限定本空间）；
 *   无审核权限 → 403 review.access_denied
 * - GET /mine        登录面（无权限码——自己的提交）
 * - GET /:id         review:approve 面 or 提交人本人（task ns 判定）
 * - POST /:id/approve | /:id/reject   review:approve（rbac.can 含 SUPER_ADMIN 短路 +
 *   FROZEN 拒写）+ 防自审（服务内 isSelfReview——SUPER_ADMIN 例外显式放行）
 * - POST /:id/withdraw                提交人本人 / asset owner / 空间 ADMIN/OWNER
 *   （withdrawReview 服务内判定——路由传 nsRole/isSuperAdmin）
 * 错误出口统一 app.onError（ReviewError 认领——见 app.ts 装配）。
 */
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuditWriter } from '../audit/audit.js';
import { findNamespaceBySlug } from '../assets/service.js';
import { AuthError } from '../auth/errors.js';
import { PERMISSIONS } from '../auth/permissions.js';
import type { Db } from '../db/client.js';
import { reviewTask } from '../db/schema/index.js';
import { ReviewError, reviewErrorCodes } from '../review/errors.js';
import { approveReview, rejectReview, withdrawReview } from '../review/service.js';
import { getReviewDetail, listMine, listQueue, parseReviewStatus, type QueueFilters } from '../review/query.js';
import { requireAuth, assertTokenScoped } from './auth-middleware.js';

const PAGE_SCHEMA = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const APPROVE_BODY = z.object({ comment: z.string().trim().max(2000).optional() });
const REJECT_BODY = z.object({ comment: z.string().trim().min(1).max(2000) });

export function createReviewRoutes(deps: { db: Db; audit: AuditWriter }): Hono {
  const { db, audit } = deps;
  const app = new Hono();

  /** task 所在空间 id（路由层权限判定需 ns 上下文；不存在 → 404） */
  async function taskNamespaceId(taskId: number): Promise<number> {
    const [row] = await db.select({ namespaceId: reviewTask.namespaceId }).from(reviewTask).where(eq(reviewTask.id, taskId));
    if (!row) throw new ReviewError(reviewErrorCodes.notFound);
    return row.namespaceId;
  }

  /** 审核队列（review:approve 面——design §9） */
  app.get('/', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const rbac = c.get('rbac')!;
    const platformRoles = await rbac.platformRolesOf(principal.userId);
    const isPlatformReviewer = platformRoles.includes('ASSET_ADMIN') || platformRoles.includes('SUPER_ADMIN');

    const query = PAGE_SCHEMA.safeParse(c.req.query());
    if (!query.success) return c.json({ code: 'request.invalid', message: 'invalid pagination params' }, 400);
    const status = parseReviewStatus(c.req.query('status'));

    const filters: QueueFilters = { status, limit: query.data.limit, offset: query.data.offset };
    const nsSlug = c.req.query('namespaceSlug');

    if (!isPlatformReviewer) {
      // 空间管理面：须限定本空间且具 OWNER/ADMIN（05 §6.4 review:approve 行）
      if (!nsSlug) return c.json({ code: 'review.access_denied', message: 'review queue requires platform reviewer or namespace admin' }, 403);
      const ns = await findNamespaceBySlug(db, nsSlug);
      if (!ns) throw new ReviewError(reviewErrorCodes.notFound);
      const roles = await rbac.getNamespaceRoles(principal.userId, ns.id);
      const isNsAdmin = roles.includes('OWNER') || roles.includes('ADMIN');
      if (!isNsAdmin) throw new ReviewError(reviewErrorCodes.accessDenied);
      filters.namespaceId = ns.id;
    } else if (nsSlug) {
      const ns = await findNamespaceBySlug(db, nsSlug);
      if (!ns) throw new ReviewError(reviewErrorCodes.notFound);
      filters.namespaceId = ns.id;
    }

    const result = await listQueue(db, filters);
    return c.json({ items: result.items, total: result.total, limit: query.data.limit, offset: query.data.offset });
  });

  // 我的提交（登录面）
  app.get('/mine', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const query = PAGE_SCHEMA.safeParse(c.req.query());
    if (!query.success) return c.json({ code: 'request.invalid', message: 'invalid pagination params' }, 400);
    const status = parseReviewStatus(c.req.query('status'));
    const result = await listMine(db, principal.userId, { status, limit: query.data.limit, offset: query.data.offset });
    return c.json({ items: result.items, total: result.total, limit: query.data.limit, offset: query.data.offset });
  });

  // 详情（review:approve 面 or 提交人本人——design §9；404/403 服务内）
  app.get('/:id', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const taskId = Number(c.req.param('id'));
    if (!Number.isInteger(taskId) || taskId <= 0) throw new ReviewError(reviewErrorCodes.notFound);
    const rbac = c.get('rbac')!;
    const platformRoles = await rbac.platformRolesOf(principal.userId);
    const canApprove =
      platformRoles.includes('ASSET_ADMIN') || platformRoles.includes('SUPER_ADMIN')
        ? true
        : (await rbac.getNamespaceRoles(principal.userId, await taskNamespaceId(taskId))).some((r) => r === 'OWNER' || r === 'ADMIN');
    const detail = await getReviewDetail(db, { taskId, viewerId: principal.userId, canApprove });
    return c.json(detail);
  });

  // 审核通过（防自审服务内；SUPER_ADMIN 例外）
  app.post('/:id/approve', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const taskId = Number(c.req.param('id'));
    if (!Number.isInteger(taskId) || taskId <= 0) throw new ReviewError(reviewErrorCodes.notFound);
    const body = APPROVE_BODY.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ code: 'request.invalid', message: 'invalid body' }, 400);
    const rbac = c.get('rbac')!;
    const nsId = await taskNamespaceId(taskId);
    const canApprove = await rbac.can(principal.userId, PERMISSIONS.reviewApprove, { namespaceId: nsId });
    assertTokenScoped(c, PERMISSIONS.reviewApprove); // T15：token scope 交集（R14——scope 无码即拒）
    if (!canApprove) throw new ReviewError(reviewErrorCodes.accessDenied);
    const platformRoles = await rbac.platformRolesOf(principal.userId);
    const out = await approveReview(db, audit, {
      taskId,
      actorId: principal.userId,
      comment: body.data.comment,
      canApprove: true,
      isSuperAdmin: platformRoles.includes('SUPER_ADMIN'),
    });
    return c.json({ taskId: out.taskId, status: 'APPROVED', version: out.publishedVersion }, 200);
  });

  // 审核拒绝（comment 必填——服务内校验）
  app.post('/:id/reject', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const taskId = Number(c.req.param('id'));
    if (!Number.isInteger(taskId) || taskId <= 0) throw new ReviewError(reviewErrorCodes.notFound);
    const body = REJECT_BODY.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ code: 'request.invalid', message: 'reject requires non-empty comment' }, 400);
    const rbac = c.get('rbac')!;
    const nsId = await taskNamespaceId(taskId);
    const canApprove = await rbac.can(principal.userId, PERMISSIONS.reviewApprove, { namespaceId: nsId });
    assertTokenScoped(c, PERMISSIONS.reviewApprove); // T15：token scope 交集（R14——scope 无码即拒）
    if (!canApprove) throw new ReviewError(reviewErrorCodes.accessDenied);
    const platformRoles = await rbac.platformRolesOf(principal.userId);
    const out = await rejectReview(db, audit, {
      taskId,
      actorId: principal.userId,
      comment: body.data.comment,
      canApprove: true,
      isSuperAdmin: platformRoles.includes('SUPER_ADMIN'),
    });
    return c.json({ taskId: out.taskId, status: 'REJECTED', version: out.rejectedVersion }, 200);
  });

  // 撤回提审（PENDING_REVIEW → UPLOADED——design §3.5 R6）
  app.post('/:id/withdraw', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const taskId = Number(c.req.param('id'));
    if (!Number.isInteger(taskId) || taskId <= 0) throw new ReviewError(reviewErrorCodes.notFound);
    const rbac = c.get('rbac')!;
    const nsId = await taskNamespaceId(taskId);
    const platformRoles = await rbac.platformRolesOf(principal.userId);
    const nsRole = (await rbac.getNamespaceRoles(principal.userId, nsId))[0] ?? null;
    await withdrawReview(db, audit, {
      taskId,
      actorId: principal.userId,
      namespaceRole: nsRole as 'OWNER' | 'ADMIN' | 'MEMBER' | null,
      isSuperAdmin: platformRoles.includes('SUPER_ADMIN'),
    });
    return c.body(null, 204);
  });

  return app;
}
