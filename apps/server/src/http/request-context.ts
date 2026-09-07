import { randomUUID } from 'node:crypto';
import type { Context, Next } from 'hono';

/** 请求上下文：审计网络字段来源（08 §6 v1.1 D5） */
export interface RequestContext {
  requestId: string;
  clientIp: string;
  userAgent: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    requestContext: RequestContext;
  }
}

/** 注入 request_id / client_ip / user_agent（审计与排查用） */
export function requestContextMiddleware() {
  return async (c: Context, next: Next) => {
    const forwarded = c.req.header('x-forwarded-for');
    c.set('requestContext', {
      requestId: randomUUID(),
      clientIp: forwarded?.split(',')[0]?.trim() ?? 'unknown',
      userAgent: c.req.header('user-agent') ?? '',
    });
    await next();
  };
}
