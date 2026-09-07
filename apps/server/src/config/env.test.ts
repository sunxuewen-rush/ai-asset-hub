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
});
