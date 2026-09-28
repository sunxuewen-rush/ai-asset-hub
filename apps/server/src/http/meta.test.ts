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
