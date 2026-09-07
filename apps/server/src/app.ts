import { Hono } from 'hono';

/**
 * Hono app 工厂——路由与中间件在此注册（测试经 app.request 全链路调用）。
 */
export function createApp(): Hono {
  const app = new Hono();
  app.get('/healthz', (c) => c.json({ status: 'ok' }));
  return app;
}

export const app = createApp();
