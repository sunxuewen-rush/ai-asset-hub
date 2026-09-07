import { afterEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { Configuration } from 'openid-client';
import { AuthError } from '../auth/errors.js';
import { resetOidcClientCache } from '../auth/oidc.js';
import type { SessionManager } from '../auth/session.js';
import { resetEnvCache } from '../config/env.js';
import type { Db } from '../db/client.js';
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
  const app = createOidcRoutes({
    cookieSecure: false,
    oidcProvider: deps?.provider,
    // authorize/disabled/state 分支不触 db/sessions——测试 stub（callback 成功路径
    // 依赖 code exchange 真实网络，由 T28 fake issuer 冒烟覆盖）
    db: {} as unknown as Db,
    sessions: {} as unknown as SessionManager,
    sessionTtlHours: 8,
  });
  // 镜像 app.ts 统一错误出口（AuthError → 结构化响应）
  app.onError((err, c) => {
    if (err instanceof AuthError) {
      return c.json(
        { code: err.code, message: err.message },
        err.status as 400 | 401 | 403 | 409 | 429,
      );
    }
    throw err;
  });
  return app;
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

describe('GET /api/auth/oidc/callback（T25 state 校验面）', () => {
  it('OIDC disabled → 404 oidc.not_configured', async () => {
    withBaseEnv();
    resetEnvCache();
    resetOidcClientCache();
    const app = makeApp();
    const res = await app.request('/callback?code=x&state=y');
    expect(res.status).toBe(404);
  });

  it('state cookie 缺失/不匹配 → 403 auth.oidc_state_mismatch（防 CSRF 式回放）', async () => {
    const app = makeApp({ provider: async () => offlineClient() });
    // 无 cookie
    const noCookie = await app.request('/callback?code=x&state=anything');
    expect(noCookie.status).toBe(403);
    const body = (await noCookie.json()) as { code: string };
    expect(body.code).toBe('auth.oidc_state_mismatch');
    // 有 cookie 但 state 不匹配
    const good = await app.request('/authorize');
    const setCookie = good.headers.get('set-cookie')!;
    const cookiePart = setCookie.split(';')[0]!;
    const mismatch = await app.request('/callback?code=x&state=not-the-same', {
      headers: { cookie: cookiePart },
    });
    expect(mismatch.status).toBe(403);
    // 成功后 cookie 被清除（防重放）
    expect(mismatch.headers.get('set-cookie')).toContain(`${OIDC_STATE_COOKIE}=;`);
  });
  // 成功路径（claims → provision → 自动登录 → 302）依赖 code exchange 真实网络 →
  // T28 fake issuer 冒烟覆盖（文件头诚实标注）
});
