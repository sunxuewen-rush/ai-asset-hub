import { afterEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { Configuration } from 'openid-client';
import { resetOidcClientCache } from '../auth/oidc.js';
import { resetEnvCache } from '../config/env.js';
import {
  clearOidcStateCookie,
  createOidcRoutes,
  OIDC_STATE_COOKIE,
  parseOidcStateCookie,
} from './oidc-routes.js';

/**
 * T24 authorize 单测：disabled → 404；enabled（离线 Configuration 注入，免真实
 * discovery——Configuration 构造不触网）→ 302 + Location 参数 + state cookie。
 * 真实 discovery 路径由 T28 fake issuer 冒烟覆盖（诚实标注）。
 */

function makeApp(deps?: { provider?: () => Promise<Configuration | null> }): Hono {
  return createOidcRoutes({
    cookieSecure: false,
    oidcProvider: deps?.provider,
  });
}

/** 离线 Configuration：仅含 authorize 所需 metadata，构造不发任何请求 */
function offlineClient(): Configuration {
  return new Configuration(
    {
      issuer: 'https://issuer.test',
      authorization_endpoint: 'https://issuer.test/authorize',
      token_endpoint: 'https://issuer.test/token',
      jwks_uri: 'https://issuer.test/jwks',
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
    },
    'aih-test',
    {
      client_secret: 'test-secret',
      redirect_uris: ['http://localhost:3000/api/auth/oidc/callback'],
    },
  );
}

function withBaseEnv() {
  process.env.DATABASE_URL = 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
  process.env.SESSION_SECRET = 'x'.repeat(40);
}

afterEach(() => {
  resetOidcClientCache();
  resetEnvCache();
});

describe('GET /api/auth/oidc/authorize（T24）', () => {
  it('OIDC disabled（默认 env）→ 404 oidc.not_configured', async () => {
    withBaseEnv();
    const app = makeApp();
    const res = await app.request('/authorize');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('oidc.not_configured');
    // 不落 state cookie
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('enabled → 302 Location 指向 provider 且带 state/nonce/code_challenge；state cookie HttpOnly 落', async () => {
    const app = makeApp({ provider: async () => offlineClient() });
    const res = await app.request('/authorize');
    expect(res.status).toBe(302);
    const location = res.headers.get('location')!;
    expect(location.startsWith('https://issuer.test/authorize')).toBe(true);
    const url = new URL(location);
    expect(url.searchParams.get('scope')).toBe('openid profile email');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    const state = url.searchParams.get('state')!;
    const nonce = url.searchParams.get('nonce')!;
    expect(state.length).toBeGreaterThanOrEqual(32);
    expect(nonce.length).toBeGreaterThanOrEqual(16);
    expect(url.searchParams.get('code_challenge')!.length).toBeGreaterThanOrEqual(40);

    const setCookie = res.headers.get('set-cookie')!;
    expect(setCookie).toContain(`${OIDC_STATE_COOKIE}=`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Max-Age=300');
    // cookie 内容可回读且与 Location 参数一致
    const raw = decodeURIComponent(setCookie.split(';')[0]!.split('=').slice(1).join('='));
    const payload = parseOidcStateCookie(raw)!;
    expect(payload).not.toBeNull();
    expect(payload.state).toBe(state);
    expect(payload.nonce).toBe(nonce);
    expect(payload.codeVerifier.length).toBeGreaterThanOrEqual(40);
  });

  it('parseOidcStateCookie：畸形/非 JSON/缺字段 → null', () => {
    expect(parseOidcStateCookie(undefined)).toBeNull();
    expect(parseOidcStateCookie('not-json')).toBeNull();
    expect(parseOidcStateCookie('{"state":"a"}')).toBeNull();
    expect(parseOidcStateCookie('{"state":"s","nonce":"n","codeVerifier":"v"}')).toEqual({
      state: 's',
      nonce: 'n',
      codeVerifier: 'v',
    });
  });

  it('clearOidcStateCookie 清 cookie', async () => {
    const app = new Hono();
    app.get('/clear', (c) => {
      clearOidcStateCookie(c);
      return c.text('ok');
    });
    const res = await app.request('/clear');
    expect(res.headers.get('set-cookie')).toContain(`${OIDC_STATE_COOKIE}=;`);
  });
});
