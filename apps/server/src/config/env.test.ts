import { describe, expect, it } from 'bun:test';
import { parseEnv } from './env.js';

const baseEnv: Record<string, string> = {
  DATABASE_URL: 'postgres://aih:aih@localhost:5433/ai_asset_hub',
  SESSION_SECRET: 'x'.repeat(40),
};

describe('parseEnv', () => {
  it('accepts a valid minimal config with defaults', () => {
    const env = parseEnv(baseEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.SESSION_TTL_HOURS).toBe(8);
    expect(env.REGISTRATION_ENABLED).toBe(false); // M4c-1 T7：自助注册默认关闭（R3）
    expect(env.ACCESS_POLICY).toBe('open');
    expect(env.STORAGE_DRIVER).toBe('local');
    expect(env.STORAGE_DIR).toBe('./storage');
    expect(env.OIDC_ENABLED).toBe(false);
    expect(env.PUBLIC_BASE_URL).toBe('http://localhost:3000');
    expect(env.LDAP_ENABLED).toBe(false);
    expect(env.LDAP_USER_ID_ATTR).toBe('sAMAccountName');
  });

  it('rejects missing DATABASE_URL', () => {
    const { DATABASE_URL: _omit, ...rest } = baseEnv;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('rejects short SESSION_SECRET', () => {
    expect(() => parseEnv({ ...baseEnv, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('rejects LDAP_ENABLED=true without LDAP_URLS', () => {
    expect(() => parseEnv({ ...baseEnv, LDAP_ENABLED: 'true' })).toThrow(/LDAP_URLS/);
  });

  it('accepts LDAP_ENABLED=true with LDAP_URLS', () => {
    const env = parseEnv({
      ...baseEnv,
      LDAP_ENABLED: 'true',
      LDAP_URLS: 'ldap://dc1.example.com:389,ldap://dc2.example.com:389',
    });
    expect(env.LDAP_ENABLED).toBe(true);
    expect(env.LDAP_URLS).toContain('dc2.example.com');
  });

  it('rejects ACCESS_POLICY not implemented in M1', () => {
    expect(() => parseEnv({ ...baseEnv, ACCESS_POLICY: 'email_domain' })).toThrow(
      /not implemented/,
    );
  });

  it('accepts explicit storage driver and dir', () => {
    const env = parseEnv({ ...baseEnv, STORAGE_DRIVER: 'local', STORAGE_DIR: '/data/objects' });
    expect(env.STORAGE_DRIVER).toBe('local');
    expect(env.STORAGE_DIR).toBe('/data/objects');
  });

  it('rejects STORAGE_DRIVER=s3 not implemented in M1 (防静默误配)', () => {
    expect(() => parseEnv({ ...baseEnv, STORAGE_DRIVER: 's3' })).toThrow(/not implemented/);
  });

  it('rejects unknown storage driver value', () => {
    expect(() => parseEnv({ ...baseEnv, STORAGE_DRIVER: 'ftp' })).toThrow();
  });

  it('OIDC disabled 全缺 OK（独立部署不受影响）', () => {
    const env = parseEnv(baseEnv);
    expect(env.OIDC_ENABLED).toBe(false);
    expect(env.OIDC_DISCOVERY_URL).toBe('');
    expect(env.PUBLIC_BASE_URL).toBe('http://localhost:3000');
  });

  it('OIDC enabled 缺 discovery/clientId → 拒启（配置完整性）', () => {
    expect(() => parseEnv({ ...baseEnv, OIDC_ENABLED: 'true' })).toThrow(
      /OIDC_DISCOVERY_URL and OIDC_CLIENT_ID/,
    );
    expect(() =>
      parseEnv({
        ...baseEnv,
        OIDC_ENABLED: 'true',
        OIDC_DISCOVERY_URL: 'https://issuer.example.com',
      }),
    ).toThrow(/OIDC_CLIENT_ID/);
  });

  it('OIDC enabled + 完整配置通过；OIDC_REDIRECT_URL 可缺省', () => {
    const env = parseEnv({
      ...baseEnv,
      OIDC_ENABLED: 'true',
      OIDC_DISCOVERY_URL: 'https://issuer.example.com/.well-known/openid-configuration',
      OIDC_CLIENT_ID: 'aih',
      OIDC_CLIENT_SECRET: 's3cret',
    });
    expect(env.OIDC_ENABLED).toBe(true);
    expect(env.OIDC_REDIRECT_URL).toBeUndefined();
  });

  it('discovery 非 https 且非 localhost → 拒启（防降级窃听 P6）', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        OIDC_ENABLED: 'true',
        OIDC_DISCOVERY_URL: 'http://issuer.example.com/oidc',
        OIDC_CLIENT_ID: 'aih',
      }),
    ).toThrow(/https/);
    // localhost http 开发例外放行
    const env = parseEnv({
      ...baseEnv,
      OIDC_ENABLED: 'true',
      OIDC_DISCOVERY_URL: 'http://localhost:9000/oidc',
      OIDC_CLIENT_ID: 'aih',
    });
    expect(env.OIDC_ENABLED).toBe(true);
  });

  // ── M4c-3 T1：外部身份源 env 契约（+13 键 · fail-fast · G1）──
  it('外部身份源默认全关（独立部署零影响）', () => {
    const env = parseEnv(baseEnv);
    expect(env.ENTRA_ENABLED).toBe(false);
    expect(env.ENTRA_CLIENT_ID).toBe('');
    expect(env.ENTRA_TENANT_ID).toBe('');
    expect(env.SOCIAL_GOOGLE_ENABLED).toBe(false);
    expect(env.SOCIAL_GITHUB_ENABLED).toBe(false);
    expect(env.SOCIAL_WECHAT_ENABLED).toBe(false);
  });

  it('Entra 全配通过（tenantId 为必填项）', () => {
    const env = parseEnv({
      ...baseEnv,
      ENTRA_ENABLED: 'true',
      ENTRA_CLIENT_ID: 'api://aih',
      ENTRA_CLIENT_SECRET: 's3cret',
      ENTRA_TENANT_ID: '11111111-2222-3333-4444-555555555555',
    });
    expect(env.ENTRA_ENABLED).toBe(true);
    expect(env.ENTRA_TENANT_ID).toBe('11111111-2222-3333-4444-555555555555');
  });

  it('社交三通道全配通过', () => {
    const env = parseEnv({
      ...baseEnv,
      SOCIAL_GOOGLE_ENABLED: 'true',
      SOCIAL_GOOGLE_CLIENT_ID: 'g-id',
      SOCIAL_GOOGLE_CLIENT_SECRET: 'g-secret',
      SOCIAL_GITHUB_ENABLED: 'true',
      SOCIAL_GITHUB_CLIENT_ID: 'gh-id',
      SOCIAL_GITHUB_CLIENT_SECRET: 'gh-secret',
      SOCIAL_WECHAT_ENABLED: 'true',
      SOCIAL_WECHAT_CLIENT_ID: 'wx-id',
      SOCIAL_WECHAT_CLIENT_SECRET: 'wx-secret',
    });
    expect(env.SOCIAL_GOOGLE_ENABLED).toBe(true);
    expect(env.SOCIAL_GITHUB_ENABLED).toBe(true);
    expect(env.SOCIAL_WECHAT_ENABLED).toBe(true);
  });

  it('fail-fast：启用但缺凭据 → 拒启（四通道各一例）', () => {
    // Entra 缺 clientSecret（tenantId 已给 ⇒ 隔离出「凭据校验」这条路径）
    expect(() =>
      parseEnv({
        ...baseEnv,
        ENTRA_ENABLED: 'true',
        ENTRA_CLIENT_ID: 'api://aih',
        ENTRA_TENANT_ID: 't-1',
      }),
    ).toThrow(/ENTRA_CLIENT_SECRET/);
    // Google 缺 clientId
    expect(() =>
      parseEnv({ ...baseEnv, SOCIAL_GOOGLE_ENABLED: 'true', SOCIAL_GOOGLE_CLIENT_SECRET: 's' }),
    ).toThrow(/SOCIAL_GOOGLE_CLIENT_ID/);
    // GitHub 缺 clientSecret
    expect(() =>
      parseEnv({ ...baseEnv, SOCIAL_GITHUB_ENABLED: 'true', SOCIAL_GITHUB_CLIENT_ID: 'i' }),
    ).toThrow(/SOCIAL_GITHUB_CLIENT_SECRET/);
    // WeChat 缺 clientId
    expect(() =>
      parseEnv({ ...baseEnv, SOCIAL_WECHAT_ENABLED: 'true', SOCIAL_WECHAT_CLIENT_SECRET: 's' }),
    ).toThrow(/SOCIAL_WECHAT_CLIENT_ID/);
  });

  it('G1：ENTRA_ENABLED=true 且 tenantId 空 → 拒启（必须收紧本租户）', () => {
    expect(() =>
      parseEnv({
        ...baseEnv,
        ENTRA_ENABLED: 'true',
        ENTRA_CLIENT_ID: 'api://aih',
        ENTRA_CLIENT_SECRET: 's3cret',
      }),
    ).toThrow(/ENTRA_TENANT_ID/);
  });
});
