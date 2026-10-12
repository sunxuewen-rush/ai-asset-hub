/**
 * `/api/meta/*` —— 平台静态元数据（**匿名只读**，与 `/api/stats` 同档）。
 *
 * - `GET /api/meta/limits`（M4b-7 T1）：发布页上限文案的单一真值源。
 * - `GET /api/meta/auth-providers`（**M4c-3 T3** · 批 design §3.3 / C3）：登录页**外部身份源启用集** ——
 *   前端据此按启用集渲染 provider 入口（0 启用 ⇒ 整行不渲染）。官方**无**「列出已配置 provider」
 *   的只读端点（实测 `dist/api/routes/` 全表）⇒ 本仓自备（先例即本文件的 `/limits`）。
 *
 * 语义（两者同档）：只读 · 无副作用 · **不入审计** · **只回显白名单字段**（不回显其他 env）。
 */
import { Hono } from 'hono';
import { type Env, getEnv } from '../config/env.js';

/** 出参形状（`03`/`02` §5 资产包上限三键；键名即前端消费名） */
export interface PlatformLimits {
  /** 单包（zip）总字节上限 */
  packageMaxBytes: number;
  /** 包内单文件字节上限 */
  fileMaxBytes: number;
  /** 包内文件数上限 */
  maxFiles: number;
}

/** 出参形状（M4c-3 §3.3）：值 = **官方 provider 键名**，序 = **界面入口序**的启用子集 */
export interface AuthProviders {
  providers: string[];
}

/**
 * 界面入口序（M4c-3 §3.3 · C3）—— 与登录页链接行**从左到右**一致。
 * 单一真值源：前端按本序渲染（不另立一份顺序表）。
 */
const AUTH_PROVIDER_ORDER: ReadonlyArray<readonly [string, (env: Env) => boolean]> = [
  ['microsoft', (env) => env.ENTRA_ENABLED],
  ['google', (env) => env.SOCIAL_GOOGLE_ENABLED],
  ['github', (env) => env.SOCIAL_GITHUB_ENABLED],
  ['wechat', (env) => env.SOCIAL_WECHAT_ENABLED],
];

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
  // GET /api/meta/auth-providers（M4c-3 T3；匿名——只回显**启用集**，零副作用：本工厂**无 db / audit 入参**）
  app.get('/auth-providers', (c) => {
    const env = getEnv();
    const payload: AuthProviders = {
      providers: AUTH_PROVIDER_ORDER.filter(([, isEnabled]) => isEnabled(env)).map(
        ([name]) => name,
      ),
    };
    return c.json(payload);
  });
  return app;
}
