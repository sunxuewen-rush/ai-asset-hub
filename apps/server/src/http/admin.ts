/**
 * /api/admin 路由组（M4b-6 T1 · 服务端改动 1–3）：管理看板三**只读**端点。
 *
 * 权限 = `role >= ADMIN`（design §5.1 / D17：看板 / 资产管理 / 审计日志同档；标签定义另为 `>= SUPER_ADMIN`）。
 * **不挂 token scope**：design §5.1 未要求 scope 限定（与 `/api/audit` 的 `audit:read` 不同——审计面另有凭证级语义）；
 * 若后续要收紧，加 `{ scope: … }` 即可（单点）。
 *
 * 实时查询、**不加缓存**、不加特殊 `Cache-Control`（D54）。
 */
import { Hono } from 'hono';
import { z } from 'zod';
import { getAdminOverview } from '../admin/overview.js';
import { getAdminRankings, RANKINGS_DEFAULT, RANKINGS_MAX } from '../admin/rankings.js';
import { clampTrendDays, getAdminTrends, TREND_DAYS_DEFAULT } from '../admin/trends.js';
import { ACCOUNT_ROLE } from '../auth/rbac.js';
import type { Db } from '../db/client.js';
import { requireRole } from './auth-middleware.js';

export interface AdminRoutesDeps {
  db: Db;
}

const rankingsQuerySchema = z.object({
  // Top N（D7 值域 10/20/50/100；服务端钳在 1–100 —— 「实际条数不足按实际条数展示」由数据决定）
  limit: z.coerce.number().int().min(1).max(RANKINGS_MAX).default(RANKINGS_DEFAULT),
});

const trendsQuerySchema = z.object({
  // **任意整数**都收：越界（含 0 / 负数 / 超大）由 `clampTrendDays` 夹到最近档（U8 已闭环 ⇒ 不返 400）；
  // 只有**非数字**（`NaN`）才 400 —— 夹档语义针对「数值越界」，不针对「参数不是数」
  days: z.coerce.number().int().default(TREND_DAYS_DEFAULT),
});

export function createAdminRoutes({ db }: AdminRoutesDeps): Hono {
  const app = new Hono();

  app.use('*', requireRole(ACCOUNT_ROLE.ADMIN));

  // GET /api/admin/overview —— KPI 7 项 + 一级标签维度（KPI 空集 ⇒ null；labels 空集 ⇒ []）
  app.get('/overview', async (c) => {
    const overview = await getAdminOverview(db);
    return c.json(overview);
  });

  // GET /api/admin/rankings?limit=N —— 三口径排行榜（人 / 标签 / 资产）
  app.get('/rankings', async (c) => {
    const parsed = rankingsQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const rankings = await getAdminRankings(db, parsed.data.limit);
    return c.json(rankings);
  });

  // GET /api/admin/trends?days=N —— 两条累计序列（含今天共 N 点 · Asia/Shanghai 日切）
  app.get('/trends', async (c) => {
    const parsed = trendsQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json({ code: 'request.invalid', message: parsed.error.issues[0]?.message }, 400);
    }
    const days = clampTrendDays(parsed.data.days);
    const points = await getAdminTrends(db, days);
    return c.json({ days, points });
  });

  return app;
}
