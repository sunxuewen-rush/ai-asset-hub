/**
 * GET /api/stats（M4a R7——匿名公开统计；聚合语义见 assets/stats.ts 注释）。
 */
import { Hono } from 'hono';
import { getPublicStats } from '../assets/stats.js';
import type { Db } from '../db/client.js';

export function createStatsRoutes({ db }: { db: Db }): Hono {
  const app = new Hono();
  // GET /api/stats（匿名——恒公开面 + `status = ACTIVE` 聚合；首页 hero 统计条数据源）
  app.get('/', async (c) => {
    const stats = await getPublicStats(db);
    return c.json(stats);
  });
  return app;
}
