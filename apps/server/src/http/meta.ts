/**
 * GET /api/meta/limits（M4b-7 T1——平台静态上限；**匿名只读**，与 `/api/stats` 同档）。
 *
 * 用途：发布页（`/dashboard/publish`）上限文案的**单一真值源** —— 前端兜底常量仅在端点
 * 不可达时用于文案（判定恒在服务端）。
 * 语义：只读 · 无副作用 · **不入审计** · 只回显三个上限键（不回显其他 env）。
 */
import { Hono } from 'hono';
import { getEnv } from '../config/env.js';

/** 出参形状（`03`/`02` §5 资产包上限三键；键名即前端消费名） */
export interface PlatformLimits {
  /** 单包（zip）总字节上限 */
  packageMaxBytes: number;
  /** 包内单文件字节上限 */
  fileMaxBytes: number;
  /** 包内文件数上限 */
  maxFiles: number;
}

export function createMetaRoutes(): Hono {
  const app = new Hono();
  // GET /api/meta/limits（匿名——平台静态上限，非用户数据；不挂 requireAuth）
  app.get('/limits', (c) => {
    const env = getEnv();
    const limits: PlatformLimits = {
      packageMaxBytes: env.ASSET_PACKAGE_MAX_BYTES,
      fileMaxBytes: env.ASSET_FILE_MAX_BYTES,
      maxFiles: env.ASSET_MAX_FILES,
    };
    return c.json(limits);
  });
  return app;
}
