/**
 * /api/labels 路由组（M3 design §5 R11；06 §5.1/§5.2——定义管理 SUPER_ADMIN + 公开列表）。
 * 权限（06 §3）：定义 CRUD/排序 仅 SUPER_ADMIN（零新权限码——permissions.ts 十枚无 label 码）；
 * 挂载面（PUT/DELETE assets/{ns}/{slug}/labels/{slug}）在 T11（http/assets.ts，canManageAsset 分判）。
 * 管理面错误出口 app.onError（LabelError 认领——见 app.ts 装配）。
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuditWriter } from '../audit/audit.js';
import type { Db } from '../db/client.js';
import { labelTypeSchema } from '../db/schema/index.js';
import { LabelError, labelErrorCodes } from '../labels/errors.js';
import {
  createLabel,
  deleteLabel,
  labelSlugSchema,
  listManagedLabels,
  listPublicLabels,
  reorderLabels,
  translationInputSchema,
  updateLabel,
} from '../labels/service.js';
import { requireAuth } from './auth-middleware.js';

const TRANSLATION = z.object({
  locale: z.string().min(2).max(16),
  displayName: z.string().min(1).max(128),
});

const CREATE_BODY = z.object({
  slug: labelSlugSchema,
  type: labelTypeSchema,
  visibleInFilter: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  parentSlug: z.string().max(64).nullable().optional(),
  translations: z.array(TRANSLATION).max(20).optional(),
});

const UPDATE_BODY = CREATE_BODY.partial().extend({
  // partial 允许 slug 变更为空——管理端点 slug 走 path，body 不承载 slug
  slug: z.never().optional(),
});

const REORDER_BODY = z.object({
  order: z.array(z.object({ slug: labelSlugSchema, sortOrder: z.number().int() })).min(1).max(200),
});

export function createLabelRoutes(deps: { db: Db; audit: AuditWriter }): Hono {
  const { db, audit } = deps;
  const app = new Hono();

  /** SUPER_ADMIN 门（06 §3：定义 CRUD 仅超管——requireAuth 后 principal 恒有） */
  async function assertSuperAdmin(c: import('hono').Context): Promise<void> {
    const principal = c.get('principal')!;
    const rbac = c.get('rbac')!;
    const roles = await rbac.platformRolesOf(principal.userId);
    if (!roles.includes('SUPER_ADMIN')) throw new LabelError(labelErrorCodes.accessDenied);
  }

  // 公开列表（匿名——06 §5.1；displayName 回退 Accept-Language → en → slug）
  app.get('/', async (c) => {
    const locale = (c.req.header('accept-language') ?? 'en').split(',')[0]!.split(';')[0]!.trim();
    const items = await listPublicLabels(db, locale);
    return c.json(items);
  });

  // 管理全量（SUPER_ADMIN——含 PRIVILEGED/隐藏项 + 翻译）
  app.get('/all', requireAuth(), async (c) => {
    await assertSuperAdmin(c);
    return c.json(await listManagedLabels(db));
  });

  app.post('/', requireAuth(), async (c) => {
    await assertSuperAdmin(c);
    const body = CREATE_BODY.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ code: 'request.invalid', message: 'invalid label body' }, 400);
    const principal = c.get('principal')!;
    const created = await createLabel(db, audit, {
      ...body.data,
      translations: body.data.translations?.map((t) => ({ locale: t.locale, displayName: t.displayName })),
      createdBy: principal.userId,
    });
    return c.json(created, 201);
  });

  app.patch('/:slug', requireAuth(), async (c) => {
    await assertSuperAdmin(c);
    const slug = c.req.param('slug')!;
    if (!labelSlugSchema.safeParse(slug).success) throw new LabelError(labelErrorCodes.notFound);
    const body = UPDATE_BODY.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ code: 'request.invalid', message: 'invalid label body' }, 400);
    const principal = c.get('principal')!;
    const updated = await updateLabel(db, audit, {
      slug,
      actorId: principal.userId,
      ...body.data,
      translations: body.data.translations?.map((t) => ({ locale: t.locale, displayName: t.displayName })),
    });
    return c.json(updated);
  });

  app.delete('/:slug', requireAuth(), async (c) => {
    await assertSuperAdmin(c);
    const slug = c.req.param('slug')!;
    if (!labelSlugSchema.safeParse(slug).success) throw new LabelError(labelErrorCodes.notFound);
    const principal = c.get('principal')!;
    await deleteLabel(db, audit, { slug, actorId: principal.userId });
    return c.body(null, 204);
  });

  app.put('/order', requireAuth(), async (c) => {
    await assertSuperAdmin(c);
    const body = REORDER_BODY.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ code: 'request.invalid', message: 'invalid order body' }, 400);
    const principal = c.get('principal')!;
    await reorderLabels(db, audit, { order: body.data.order, actorId: principal.userId });
    return c.body(null, 204);
  });

  return app;
}
