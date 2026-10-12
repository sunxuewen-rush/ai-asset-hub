import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { ensureTestEnv } from '../test-utils/env-setup.js';

ensureTestEnv();

import { getEnv, resetEnvCache } from '../config/env.js';
import { createMetaRoutes } from './meta.js';

/** GET /api/meta/limits（M4b-7 T1 · design §5.1）—— 匿名只读 · 三键 = env 单源 · 不入审计 */
const LIMIT_KEYS = ['packageMaxBytes', 'fileMaxBytes', 'maxFiles'] as const;

type Limits = Record<(typeof LIMIT_KEYS)[number], number>;

function makeApp(): Hono {
  const app = new Hono();
  app.route('/api/meta', createMetaRoutes());
  return app;
}

async function fetchLimits(): Promise<{ status: number; body: Limits }> {
  const res = await makeApp().request('/api/meta/limits');
  return { status: res.status, body: (await res.json()) as Limits };
}

describe('GET /api/meta/limits（M4b-7 T1——平台静态上限）', () => {
  it('① 匿名（无 cookie / 无 Bearer）⇒ 200 —— 与 /api/stats 同档', async () => {
    const { status } = await fetchLimits();
    expect(status).toBe(200);
  });

  it('② 出参键集合精确 = 三键（防后续误加敏感 env）', async () => {
    const { body } = await fetchLimits();
    expect(Object.keys(body).sort()).toEqual([...LIMIT_KEYS].sort());
    for (const k of LIMIT_KEYS) expect(typeof body[k]).toBe('number');
  });

  it('③ 三键值 ↔ getEnv() 逐键相等（断言读源取值比对，不写死数字）', async () => {
    const env = getEnv();
    const { body } = await fetchLimits();
    expect(body.packageMaxBytes).toBe(env.ASSET_PACKAGE_MAX_BYTES);
    expect(body.fileMaxBytes).toBe(env.ASSET_FILE_MAX_BYTES);
    expect(body.maxFiles).toBe(env.ASSET_MAX_FILES);
  });

  it('④ env 单源正/反证：注入 ASSET_* ⇒ 端点读回新值；还原 ⇒ 读回原值（无写死常量）', async () => {
    const keys = ['ASSET_PACKAGE_MAX_BYTES', 'ASSET_FILE_MAX_BYTES', 'ASSET_MAX_FILES'] as const;
    const original = keys.map((k) => process.env[k]);
    const baseline = await fetchLimits();

    try {
      process.env.ASSET_PACKAGE_MAX_BYTES = '1234567';
      process.env.ASSET_FILE_MAX_BYTES = '76543';
      process.env.ASSET_MAX_FILES = '7';
      resetEnvCache();

      const injected = await fetchLimits();
      expect(injected.body).toEqual({
        packageMaxBytes: 1234567,
        fileMaxBytes: 76543,
        maxFiles: 7,
      });
    } finally {
      keys.forEach((k, i) => {
        const v = original[i];
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      });
      resetEnvCache();
    }

    const restored = await fetchLimits();
    expect(restored.body).toEqual(baseline.body);
  });
});

/**
 * GET /api/meta/auth-providers（M4c-3 **T3** · 批 design §3.3 / C3）—— 匿名只读**启用集**。
 *
 * 断言：① 全关 ⇒ `[]` ② 开 N ⇒ N 项且**序 = 界面入口序**（乱序输入不影响）③ 匿名可读 + 幂等
 * ④ **只回显启用集**（密钥类 env 的哨兵值不出现在响应里；出参键集合精确 = `['providers']`）
 * ⑤ **结构性零副作用**（工厂入参数 = 0 ⇒ 无 db / audit 句柄可写）。
 */
const FLAG_KEYS = [
  'ENTRA_ENABLED',
  'SOCIAL_GOOGLE_ENABLED',
  'SOCIAL_GITHUB_ENABLED',
  'SOCIAL_WECHAT_ENABLED',
] as const;

/** 本批 13 键（用例前后逐键复位 ⇒ 不污染同进程的其他测试文件） */
const ALL_PROVIDER_KEYS = [
  ...FLAG_KEYS,
  'ENTRA_CLIENT_ID',
  'ENTRA_CLIENT_SECRET',
  'ENTRA_TENANT_ID',
  'SOCIAL_GOOGLE_CLIENT_ID',
  'SOCIAL_GOOGLE_CLIENT_SECRET',
  'SOCIAL_GITHUB_CLIENT_ID',
  'SOCIAL_GITHUB_CLIENT_SECRET',
  'SOCIAL_WECHAT_CLIENT_ID',
  'SOCIAL_WECHAT_CLIENT_SECRET',
] as const;

/** 界面入口序的**期望值**（独立于实现常量书写 —— 不 import 实现以免断言自证） */
const ORDER = ['microsoft', 'google', 'github', 'wechat'] as const;

/** 密钥哨兵串（用于 ④：只要有一个出现在响应体即泄漏） */
const SENTINELS = [
  'SENTINEL-CLIENT-ID',
  'SENTINEL-CLIENT-SECRET',
  'SENTINEL-TENANT-ID',
  'SENTINEL-G-ID',
  'SENTINEL-G-SECRET',
  'SENTINEL-H-ID',
  'SENTINEL-H-SECRET',
  'SENTINEL-W-ID',
  'SENTINEL-W-SECRET',
] as const;

async function fetchProviders(): Promise<{
  status: number;
  text: string;
  body: { providers: string[] };
}> {
  const res = await makeApp().request('/api/meta/auth-providers');
  const text = await res.text();
  return { status: res.status, text, body: JSON.parse(text) as { providers: string[] } };
}

/** 以给定启用子集跑断言（凭据置为哨兵串 ⇒ `parseEnv` 不拒启且 ④ 可查泄漏）；随后逐键复位 */
async function withEnabled(
  enabled: ReadonlyArray<(typeof ORDER)[number]>,
  fn: () => Promise<void>,
): Promise<void> {
  const prev = ALL_PROVIDER_KEYS.map((k) => process.env[k]);
  try {
    Object.assign(process.env, {
      ENTRA_ENABLED: enabled.includes('microsoft') ? 'true' : 'false',
      SOCIAL_GOOGLE_ENABLED: enabled.includes('google') ? 'true' : 'false',
      SOCIAL_GITHUB_ENABLED: enabled.includes('github') ? 'true' : 'false',
      SOCIAL_WECHAT_ENABLED: enabled.includes('wechat') ? 'true' : 'false',
      ENTRA_CLIENT_ID: 'SENTINEL-CLIENT-ID',
      ENTRA_CLIENT_SECRET: 'SENTINEL-CLIENT-SECRET',
      ENTRA_TENANT_ID: 'SENTINEL-TENANT-ID',
      SOCIAL_GOOGLE_CLIENT_ID: 'SENTINEL-G-ID',
      SOCIAL_GOOGLE_CLIENT_SECRET: 'SENTINEL-G-SECRET',
      SOCIAL_GITHUB_CLIENT_ID: 'SENTINEL-H-ID',
      SOCIAL_GITHUB_CLIENT_SECRET: 'SENTINEL-H-SECRET',
      SOCIAL_WECHAT_CLIENT_ID: 'SENTINEL-W-ID',
      SOCIAL_WECHAT_CLIENT_SECRET: 'SENTINEL-W-SECRET',
    });
    resetEnvCache();
    await fn();
  } finally {
    ALL_PROVIDER_KEYS.forEach((k, i) => {
      const v = prev[i];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
    resetEnvCache();
  }
}

describe('GET /api/meta/auth-providers（M4c-3 T3——外部身份源启用集）', () => {
  it('① 全关 ⇒ { providers: [] }（0 启用 ⇒ 前端整行不渲染）', async () => {
    await withEnabled([], async () => {
      const { status, body } = await fetchProviders();
      expect(status).toBe(200);
      expect(body).toEqual({ providers: [] });
    });
  });

  it('② 开 N ⇒ N 项且序 = 界面入口序（1 / 2 乱序输入 / 4 三态）', async () => {
    await withEnabled(['github'], async () => {
      expect((await fetchProviders()).body.providers).toEqual(['github']);
    });
    await withEnabled(['wechat', 'microsoft'], async () => {
      // 传入顺序故意乱序 ⇒ 输出仍按界面入口序（microsoft 在前）
      expect((await fetchProviders()).body.providers).toEqual(['microsoft', 'wechat']);
    });
    await withEnabled([...ORDER], async () => {
      expect((await fetchProviders()).body.providers).toEqual([...ORDER]);
    });
  });

  it('③ 匿名可读（无 cookie / 无 Bearer）且幂等（重复请求字节恒等）', async () => {
    await withEnabled(['google'], async () => {
      const a = await fetchProviders();
      const b = await fetchProviders();
      expect(a.status).toBe(200);
      expect(a.text).toBe(b.text);
    });
  });

  it('④ 只回显启用集：密钥类 env 哨兵值不出现在响应体；出参键集合精确', async () => {
    await withEnabled([...ORDER], async () => {
      const { text } = await fetchProviders();
      for (const sentinel of SENTINELS) expect(text).not.toContain(sentinel);
      expect(Object.keys(JSON.parse(text) as object)).toEqual(['providers']);
    });
  });

  it('⑤ 结构性零副作用：工厂入参数 = 0（无 db / audit 句柄可写审计）', () => {
    expect(createMetaRoutes.length).toBe(0);
  });
});
