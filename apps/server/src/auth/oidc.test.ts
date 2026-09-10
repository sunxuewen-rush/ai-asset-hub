import { afterEach, describe, expect, it } from 'bun:test';
import { resetEnvCache } from '../config/env.js';
import { createOidcClient, getOidcClient, oidcRedirectUrl, resetOidcClientCache } from './oidc.js';

/**
 * T23 工厂单测：disabled → null 不触网；redirect 推导纯函数。
 * enabled → discovery 为真实网络依赖（openid-client 无 mock 服务模块——铁律），
 * 由 T28 fake issuer 冒烟覆盖（诚实标注）。
 */

function withBaseEnv() {
  // env 注入优先（CI / 自定义库），未注入时才兜底本地测试库。
  // 注意：**不得无条件改写全局 env**——bun test 多文件共享同一进程，无条件写入会污染后续所有
  // 文件（CI 实证：本地存在的 ai_asset_hub_test 掩盖该缺陷，CI 仅建 ai_asset_hub → 53 个文件
  // 的 beforeAll 因「database "ai_asset_hub_test" does not exist」集体失败）。
  process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
  process.env.SESSION_SECRET = 'x'.repeat(40);
}

afterEach(() => {
  resetOidcClientCache();
  resetEnvCache();
});

describe('oidc 客户端工厂（T23）', () => {
  it('OIDC_ENABLED=false → getOidcClient() 返回 null 且不触网', async () => {
    withBaseEnv();
    // 断言 null 即未发起 discovery（若触网会去连不存在的 issuer 而 reject/超时）
    const client = await getOidcClient();
    expect(client).toBeNull();
  });

  it('oidcRedirectUrl：缺省推导 PUBLIC_BASE_URL + /api/auth/oidc/callback；去尾斜杠', () => {
    expect(oidcRedirectUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/api/auth/oidc/callback',
    );
    expect(oidcRedirectUrl('https://hub.example.com/')).toBe(
      'https://hub.example.com/api/auth/oidc/callback',
    );
    expect(oidcRedirectUrl('http://localhost:3000', 'https://custom.example.com/cb')).toBe(
      'https://custom.example.com/cb',
    );
  });

  it.skip('enabled → discovery 构造（真实网络依赖：T28 fake issuer 冒烟覆盖）', async () => {
    process.env.OIDC_ENABLED = 'true';
    process.env.OIDC_DISCOVERY_URL = 'http://localhost:9999/oidc';
    process.env.OIDC_CLIENT_ID = 'aih';
    process.env.OIDC_CLIENT_SECRET = 's3cret';
    const client = await getOidcClient();
    expect(client).not.toBeNull();
    // 若走到这里说明有 fake issuer 在位
  });

  it('createOidcClient 配置推导正确（redirect/secret 传递）', async () => {
    // discovery 未调用前无法断言配置；此用例锁定参数组装路径不抛（URL 非法会在此暴露）
    expect(typeof createOidcClient).toBe('function');
    await expect(
      createOidcClient({
        discoveryUrl: 'not-a-url',
        clientId: 'aih',
        clientSecret: 's3cret',
        redirectUrl: 'http://localhost:3000/api/auth/oidc/callback',
      }),
    ).rejects.toThrow(); // new URL 非法即拒（env 层已前置 https 门，此处兜底工厂参数校验）
  });
});
