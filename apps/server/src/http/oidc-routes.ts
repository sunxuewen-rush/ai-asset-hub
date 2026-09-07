import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';
import type { OidcClient } from '../auth/oidc.js';
import { getOidcClient } from '../auth/oidc.js';

/**
 * /api/auth/oidc 路由组（T24-T25，05 §3 OIDC 授权码流）：
 * authorize 由未登录访客发起——无 session 可存，state/nonce/PKCE verifier
 * 存独立 HttpOnly cookie `oidc_state`（TTL 5min，SameSite=Lax，P6）。
 * provider 可注入（默认 getOidcClient）——测试用离线 Configuration 免真实 discovery。
 */

export const OIDC_STATE_COOKIE = 'oidc_state';
/** state cookie TTL（authorize → callback 窗口 5 分钟） */
export const OIDC_STATE_TTL_SEC = 300;

export interface OidcStatePayload {
  state: string;
  nonce: string;
  /** PKCE code_verifier（callback 换 code 用，仅存于 cookie 不落库） */
  codeVerifier: string;
}

export function parseOidcStateCookie(raw: string | undefined): OidcStatePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OidcStatePayload>;
    if (typeof parsed.state !== 'string' || typeof parsed.nonce !== 'string') return null;
    if (typeof parsed.codeVerifier !== 'string') return null;
    return parsed as OidcStatePayload;
  } catch {
    return null;
  }
}

export function readOidcState(c: Parameters<typeof getCookie>[0]): OidcStatePayload | null {
  return parseOidcStateCookie(getCookie(c, OIDC_STATE_COOKIE));
}

export function clearOidcStateCookie(c: Parameters<typeof deleteCookie>[0]): void {
  deleteCookie(c, OIDC_STATE_COOKIE, { path: '/' });
}

export interface OidcRoutesDeps {
  /** 可注入（测试离线 Configuration；缺省走 env 惰性单例） */
  oidcProvider?: () => Promise<OidcClient | null>;
  cookieSecure: boolean;
}

export function createOidcRoutes(deps: OidcRoutesDeps): Hono {
  const provider = deps.oidcProvider ?? getOidcClient;
  const app = new Hono();

  // GET /api/auth/oidc/authorize（T24：发起授权——302 provider + state cookie 落）
  app.get('/authorize', async (c) => {
    const client = await provider();
    if (!client) {
      return c.json({ code: 'oidc.not_configured', message: 'oidc.not_configured' }, 404);
    }
    const state = randomState();
    const nonce = randomNonce();
    const codeVerifier = randomPKCECodeVerifier();
    const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
    const payload: OidcStatePayload = { state, nonce, codeVerifier };
    setCookie(c, OIDC_STATE_COOKIE, JSON.stringify(payload), {
      path: '/',
      httpOnly: true,
      secure: deps.cookieSecure,
      sameSite: 'Lax',
      maxAge: OIDC_STATE_TTL_SEC,
    });
    const authUrl = buildAuthorizationUrl(client, {
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'openid profile email',
    });
    return c.redirect(authUrl.toString(), 302);
  });

  return app;
}
