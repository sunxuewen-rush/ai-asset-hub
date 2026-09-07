import type { Context, Next } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Principal, SessionManager } from './session.js';

export const SESSION_COOKIE = 'aih_session';

/** 请求上下文变量（principal 仅登录态存在） */
declare module 'hono' {
  interface ContextVariableMap {
    principal?: Principal;
  }
}

/** 读取 aih_session cookie → principal；无效/过期 → 匿名（不 401，由路由判定） */
export function sessionMiddleware(sessions: SessionManager) {
  return async (c: Context, next: Next) => {
    const sessionId = getCookie(c, SESSION_COOKIE);
    if (sessionId) {
      const session = await sessions.getSession(sessionId);
      if (session) {
        c.set('principal', { userId: session.userId, displayName: session.displayName });
      }
    }
    await next();
  };
}

/** 登出辅助：revoke + 过期 cookie */
export async function revokeSession(c: Context, sessions: SessionManager): Promise<void> {
  const sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    await sessions.revokeSession(sessionId);
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

/** 登录成功：签发 session + HttpOnly cookie（maxAge 秒——与 SESSION_TTL_HOURS 对齐，防 TTL 错位） */
export function attachSessionCookie(
  c: Context,
  sessionId: string,
  opts: { secure: boolean; sameSite: 'lax' | 'strict'; maxAgeSec: number },
): void {
  setCookie(c, SESSION_COOKIE, sessionId, {
    path: '/',
    httpOnly: true,
    secure: opts.secure,
    sameSite: opts.sameSite,
    maxAge: opts.maxAgeSec,
  });
}
