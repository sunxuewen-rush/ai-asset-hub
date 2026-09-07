import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';
import { AuthError } from '../auth/errors.js';
import type { OidcClient } from '../auth/oidc.js';
import { getOidcClient } from '../auth/oidc.js';
import { provisionExternalUser } from '../auth/provision.js';
import type { SessionManager } from '../auth/session.js';
import { attachSessionCookie } from '../auth/session-middleware.js';
import { getEnv } from '../config/env.js';
import type { Db } from '../db/client.js';

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
  db: Db;
  sessions: SessionManager;
  sessionTtlHours: number;
  /** 回调成功 302 落地（缺省 getEnv().PUBLIC_BASE_URL） */
  publicBaseUrl?: string;
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

  // GET /api/auth/oidc/callback（T25：state 比对 → code exchange（v6 内建验签/nonce/PKCE）
  // → claims → provision（T26）→ 自动登录 → 302 PUBLIC_BASE_URL/?oidc=success）
  app.get('/callback', async (c) => {
    const client = await provider();
    if (!client) {
      return c.json({ code: 'oidc.not_configured', message: 'oidc.not_configured' }, 404);
    }
    const stored = readOidcState(c);
    const url = new URL(c.req.url);
    const returnedState = url.searchParams.get('state');
    // state 与 oidc_state cookie 比对（缺失/不匹配 → 403；比对后清除 cookie 防重放）
    if (!stored || stored.state !== returnedState) {
      clearOidcStateCookie(c);
      throw new AuthError('auth.oidc_state_mismatch');
    }
    clearOidcStateCookie(c);

    let tokens: Awaited<ReturnType<typeof authorizationCodeGrant>> | undefined;
    try {
      tokens = await authorizationCodeGrant(client, url, {
        expectedState: stored.state,
        expectedNonce: stored.nonce,
        pkceCodeVerifier: stored.codeVerifier,
        idTokenExpected: true,
      });
    } catch (err) {
      // 授权被拒（error 参数）或 code exchange 校验失败（state 已在库校验、此处为
      // nonce/iss/aud/exp/签名/PKCE 面失败）→ 结构化 403
      throw new AuthError('auth.oidc_denied');
    }
    // IDToken 自定义 claims 为宽 union，逐字段窄化到 string/boolean
    const claims = tokens?.claims?.();
    if (!claims) throw new AuthError('auth.oidc_denied');
    const sub = typeof claims.sub === 'string' ? claims.sub : undefined;
    if (!sub) throw new AuthError('auth.oidc_denied');
    const name = typeof claims.name === 'string' ? claims.name.trim() : undefined;
    const email = typeof claims.email === 'string' ? claims.email : undefined;
    const emailVerified = claims.email_verified === true;
    // 建号字段（T26/T27）：id 生成 usr_oidc_<uuid>（不与任何 provider 的 sub 冲突）；
    // displayName 回退链 name → email 前缀 → sub；email 仅 email_verified 才同步（防未验证冒用）
    const displayName = name || email?.split('@')[0] || sub;
    const provisioned = await provisionExternalUser(deps.db, {
      provider: 'oidc',
      providerSubject: sub,
      userId: `usr_oidc_${randomUUID()}`,
      displayName,
      email: emailVerified ? (email ?? null) : undefined,
    });

    // 自动登录：签发 session（与本地登录同通道）
    const sessionId = await deps.sessions.createSession(provisioned.id, provisioned.displayName);
    attachSessionCookie(c, sessionId, {
      secure: deps.cookieSecure,
      sameSite: 'lax',
      maxAgeSec: deps.sessionTtlHours * 3600,
    });
    // 302 落地 = PUBLIC_BASE_URL（T25 冒烟实证：不接线则回退硬编码 3000 错位）
    const base =
      deps.publicBaseUrl?.replace(/\/$/, '') ?? getEnv().PUBLIC_BASE_URL.replace(/\/$/, '');
    return c.redirect(`${base}/?oidc=success`, 302);
  });

  return app;
}
