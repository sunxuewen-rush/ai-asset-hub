import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createAuditWriter } from './audit/audit.js';
import { LdapChannel } from './auth/ldap.js';
import { InMemoryRateLimiter } from './auth/rate-limit.js';
import { InMemorySessionStore, SessionManager } from './auth/session.js';
import { getEnv } from './config/env.js';
import { getDb } from './db/client.js';

const env = getEnv();
const db = getDb();
const sessions = new SessionManager(
  new InMemorySessionStore(env.SESSION_TTL_HOURS * 60 * 60 * 1000),
);
const audit = createAuditWriter(db);
const rateLimiter = new InMemoryRateLimiter(15 * 60 * 1000, 20);
// LDAP 通道默认关闭（05 §3.1：LDAP_ENABLED=false 独立部署不受影响）
const ldap = env.LDAP_ENABLED
  ? new LdapChannel({
      urls: env.LDAP_URLS.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      bindMode: env.LDAP_BIND_MODE,
      userBase: env.LDAP_USER_BASE,
      userIdAttr: env.LDAP_USER_ID_ATTR,
      displayNameAttr: 'displayName',
      timeoutMs: env.LDAP_TIMEOUT_MS,
    })
  : null;

// 登录限流滑动窗口周期性清理（防内存无限增长）
const sweepTimer = setInterval(() => rateLimiter.sweep(), 10 * 60 * 1000);
sweepTimer.unref();

const app = createApp({
  db,
  sessions,
  audit,
  rateLimiter,
  ldap,
  registrationEnabled: env.REGISTRATION_ENABLED,
  sessionTtlHours: env.SESSION_TTL_HOURS,
  cookieSecure: env.NODE_ENV === 'production',
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[ai-asset-hub] server listening on http://localhost:${info.port}`);
});
