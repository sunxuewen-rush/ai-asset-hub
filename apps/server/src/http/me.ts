/**
 * `/api/me` 路由组（M4b-4 **T3** · R6）：**个人面**读面。
 *
 * `GET /api/me/assets` —— 「**我名下的资产**」（含全部状态：`ACTIVE`/`HIDDEN`/`ARCHIVED`）：
 * - `ownerId` **恒取会话**（`principal.userId`），**不接受客户端传入** —— 管理档看全站走 M4b-6，不在此面
 * - 形状与公开面 `/api/assets` **同构**（同一 `assetItem()` 序列化件 + `loadAssetItemMeta` 批注入）
 * - `status` 默认 **`'ALL'`**（与公开面默认 `ACTIVE` 是两面的各自缺省）；非法值 ⇒ 400 `request.invalid`
 * - 分页/检索上限逐项对齐公开面 `listQuerySchema`（`limit` 1..100 默认 20 · `offset` ≥0 · `q` 1..100）
 * - 读面亦带 `starCount` / `starredByMe`（本面恒登录 ⇒ `starredByMe` 有实义）
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { assetSortQueryFields, listViewableAssets, loadAssetItemMeta } from '../assets/service.js';
import { starredAssetIds } from '../assets/stars.js';
import type { Db } from '../db/client.js';
import { assetStatusSchema } from '../db/schema/index.js';
import { labelsOfAssets } from '../labels/service.js';
import { assetItem, requestLocale } from './asset-item.js';
import { requireAuth } from './auth-middleware.js';

/** 与公开面 `listQuerySchema` 对齐（差异 = `status` 维度：本面默认 `'ALL'`） */
const meQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.union([assetStatusSchema, z.literal('ALL')]).default('ALL'),
  q: z.string().trim().min(1).max(100).optional(),
  // T11-f 排序（design §4.7.5）：与公开面 **同一 schema 片段**（单点，防漂移）—— 不传 ⇒ 现状排序零变化
  ...assetSortQueryFields,
});

export interface MeRoutesDeps {
  db: Db;
}

export function createMeRoutes({ db }: MeRoutesDeps): Hono {
  const app = new Hono();

  // GET /api/me/assets（R6：owner-only 集合 · 全状态 · 分页 · q 检索）
  app.get('/assets', requireAuth(), async (c) => {
    const principal = c.get('principal')!;
    const parsed = meQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const { limit, offset, status, q, sort, dir } = parsed.data;
    const { items, total } = await listViewableAssets(db, {
      limit,
      offset,
      status,
      q,
      sort,
      dir,
      // ★ ownerId 恒取会话（不接受客户端传入）
      ownerId: principal.userId,
    });
    // R5/R6：批注入 latest 版本投影 + owner 显示名（与公开面同一函数）
    const metas = await loadAssetItemMeta(db, items);
    // M4b-4 v1.8：我收藏过的资产 id（一次 inArray 防 N+1）
    const starred = await starredAssetIds(
      db,
      principal.userId,
      items.map((i) => i.id),
    );
    // M4b-4 T14：并列一次批量 labels（一次 inArray 防 N+1；语种取 Accept-Language）
    const labelsMap = await labelsOfAssets(
      db,
      items.map((i) => i.id),
      requestLocale(c),
    );
    return c.json({
      items: items.map((i) =>
        assetItem(i, metas.get(i.id), starred.has(i.id), labelsMap.get(i.id) ?? []),
      ),
      total,
      limit,
      offset,
    });
  });

  return app;
}
