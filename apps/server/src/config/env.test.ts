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
    expect(env.REGISTRATION_ENABLED).toBe(true);
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
});
