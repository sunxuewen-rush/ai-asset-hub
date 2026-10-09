import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createAuditWriter } from './audit/audit.js';
import { LdapChannel } from './auth/ldap.js';
import { getEnv } from './config/env.js';
import { getDb } from './db/client.js';
import { createStorage } from './storage/index.js';

const env = getEnv();
const db = getDb();
const audit = createAuditWriter(db);
const storage = createStorage({ driver: env.STORAGE_DRIVER, dir: env.STORAGE_DIR });
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

const app = createApp({
  db,
  audit,
  storage,
  ldap,
  cookieSecure: env.NODE_ENV === 'production',
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[ai-asset-hub] server listening on http://localhost:${info.port}`);
});
