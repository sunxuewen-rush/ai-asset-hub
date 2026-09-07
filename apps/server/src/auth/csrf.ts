import type { Context, Next } from 'hono';

/**
 * CSRF 防护（D8，cookie session 通道标配）：
 * - cookie SameSite=Lax/Strict 在 setCookie 层设
 * - non-GET/HEAD/OPTIONS 校验链：有 Origin → 与 Host 同源；缺失 → 查 Referer 同源；
 *   两者都缺失 → 拒绝（安全默认；非浏览器客户端须显式带 Origin 或走无 cookie 通道/白名单）
 * - API Token/Device Flow 通道豁免 = 白名单配置（后续实现）
 */
export function csrfProtection(opts: { allowedOrigins?: string[] } = {}) {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      await next();
      return;
    }

    const host = c.req.header('host');
    const origin = c.req.header('origin');
    const referer = c.req.header('referer');

    // 白名单整 origin 直通（无 cookie 通道豁免）
    if (origin && opts.allowedOrigins?.includes(origin)) {
      await next();
      return;
    }

    const candidate = origin ?? referer;
    // 双缺失 → 拒绝（安全默认）
    if (!candidate) {
      return c.json({ code: 'auth.csrf_failed', message: 'missing origin or referer' }, 403);
    }

    let candidateHost: string | null = null;
    try {
      candidateHost = new URL(candidate).host;
    } catch {
      return c.json({ code: 'auth.csrf_failed', message: 'invalid origin or referer' }, 403);
    }

    if (candidateHost !== host) {
      return c.json({ code: 'auth.csrf_failed', message: 'cross-origin request rejected' }, 403);
    }

    await next();
  };
}
