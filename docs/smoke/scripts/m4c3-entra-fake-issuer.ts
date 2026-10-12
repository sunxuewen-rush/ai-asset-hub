/**
 * M4c-3 L5 · **Entra 通道「假 issuer」全流程冒烟**（批 design §6 L5 · 2026-10-12 T10 落地）
 *
 * 为什么只对 `microsoft` 可做：官方 `microsoft-entra-id.mjs` 支持 `options.authority` 覆盖
 * （`authority = options.authority || 'https://login.microsoftonline.com'`），且 `tenantId ≠ common`
 * 时**校验 `iss`** = `${authority}/${tenant}/v2.0`、JWKS 走 `${authority}/${tenant}/discovery/v2.0/keys`；
 * `google` / `github` / `wechat` 端点**硬编码**，不可 fake。⇒ 本脚本自起假 IdP + 自签 RSA（`node:crypto`），
 * 经**本仓真实装配链**（`createAuth({ socialProviders })` ⇒ 官方 provider + 本仓 `databaseHooks` ⇒ `createApp` 包装层）
 * 跑通：授权 ⇒ 回调 ⇒ **建号** ⇒ 两条审计（`external.provisioned` 建号 / `auth.login.success` 登录）。
 *
 * 覆盖：L1 授权 URL 指向假 authority · L2 假 IdP 三端点健康 · L3 回调落点+会话 cookie ·
 *      L4 建号 · L5 账号链接（`(providerId, accountId)`）· L6 建号审计 · L7 登录审计（**app 层包装**）·
 *      L8 二次登录**复用不重复建号** · L9 **issuer 反证**（iss 换他人租户 ⇒ 官方必须拒绝）· L10 自建行清理复核
 *
 * 前置：`--env-file=apps/server/.env`（须 `DATABASE_URL` / `SESSION_SECRET`；`PUBLIC_BASE_URL` 缺省
 * `http://localhost:3000`）。**不连真实 IdP**（凭据为假值，仅本脚本的假端点认可）。
 * ⚠️ **本脚本会向被测库写入**（1 探针用户 + 1 account + 若干 session/审计行）**并在末尾按 FK 序清理**
 * （`audit_log` → `session` → `account` → `user`），复核零残留；**删除对象仅限本脚本自建的探针行**。
 *
 * 运行：`bun --env-file=apps/server/.env docs/smoke/scripts/m4c3-entra-fake-issuer.ts`
 */
import { createSign, generateKeyPairSync, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../../apps/server/src/app.js';
import { createAuditWriter } from '../../../apps/server/src/audit/audit.js';
import { createAuth } from '../../../apps/server/src/auth/better-auth.js';
import { createClient } from '../../../apps/server/src/db/client.js';
import { createLocalStorage } from '../../../apps/server/src/storage/local.js';

const BASE = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000';
const HOST = new URL(BASE).host;
const CLIENT_ID = 'm4c3-l5-fake-client';
const CLIENT_SECRET = 'm4c3-l5-fake-secret'; // 假凭据（仅本脚本的假 IdP 认可 · 非真实密钥）
const TENANT = '11111111-2222-3333-4444-555555555555';
const OTHER_TENANT = '99999999-8888-7777-6666-666666666666';
const STORAGE_DIR = '/tmp/m4c3-l5-storage';

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) {
    pass++;
    console.log(`PASS ${name}${extra ? `  ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`FAIL ${name}${extra ? `  ${extra}` : ''}`);
  }
};

/* ── ① 自签 RSA + JWKS + RS256 签 id_token（零第三方件） ── */
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>;
const KID = 'm4c3-l5-kid';
const JWKS = { keys: [{ ...publicJwk, kid: KID, use: 'sig', alg: 'RS256' }] };
const b64u = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const signJwt = (claims: Record<string, unknown>): string => {
  const head = b64u({ alg: 'RS256', typ: 'JWT', kid: KID });
  const body = b64u(claims);
  const data = `${head}.${body}`;
  return `${data}.${createSign('RSA-SHA256').update(data).sign(privateKey).toString('base64url')}`;
};

/* ── ② 假 IdP（随机端口 · authorize / token / discovery keys） ── */
let fakeBase = '';
/** 每轮由驱动设置的「本轮身份」+ 反证开关 */
const cur = { oid: '', email: '', badIssuer: false, omitOid: false };
const idToken = (): string => {
  const now = Math.floor(Date.now() / 1000);
  const tid = TENANT;
  return signJwt({
    iss: cur.badIssuer ? `${fakeBase}/${OTHER_TENANT}/v2.0` : `${fakeBase}/${tid}/v2.0`,
    aud: CLIENT_ID,
    tid,
    ...(cur.omitOid ? {} : { oid: cur.oid }),
    sub: `fake-sub-${cur.oid}`,
    name: 'L5 假 issuer 探针',
    email: cur.email,
    iat: now,
    nbf: now - 60,
    exp: now + 3600,
  });
};
const idp = createServer((req, res) => {
  const u = new URL(req.url ?? '/', 'http://127.0.0.1');
  const json = (code: number, obj: unknown) => {
    res.writeHead(code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  if (u.pathname === `/${TENANT}/oauth2/v2.0/authorize`) {
    const redirect = u.searchParams.get('redirect_uri') ?? '';
    const state = u.searchParams.get('state') ?? '';
    const loc = `${redirect}?code=code_${randomUUID()}&state=${encodeURIComponent(state)}`;
    res.writeHead(302, { location: loc });
    res.end();
    return;
  }
  if (u.pathname === `/${TENANT}/oauth2/v2.0/token`) {
    json(200, {
      token_type: 'Bearer',
      access_token: `fake-access-${randomUUID()}`,
      refresh_token: `fake-refresh-${randomUUID()}`,
      expires_in: 3600,
      scope: 'openid profile email',
      id_token: idToken(),
    });
    return;
  }
  if (u.pathname === `/${TENANT}/discovery/v2.0/keys`) {
    json(200, JWKS);
    return;
  }
  json(404, { error: 'not_found', path: u.pathname });
});
await new Promise<void>((r) => idp.listen(0, '127.0.0.1', () => r()));
fakeBase = `http://127.0.0.1:${(idp.address() as AddressInfo).port}`;

/* ── ③ 本仓真实装配链（假 authority 注入 · 真审计写手 · 完整 app 包装层） ── */
const db = createClient(process.env.DATABASE_URL as string);
const pool = (
  db as unknown as {
    $client: {
      query(s: string, p?: unknown[]): Promise<{ rows: unknown[] }>;
      end(): Promise<void>;
    };
  }
).$client;
const rows = async (sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> =>
  (await pool.query(sql, params)).rows as Record<string, unknown>[];

const auth = createAuth({
  socialProviders: {
    microsoft: {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      tenantId: TENANT,
      authority: fakeBase,
      /** 跳过官方 Graph 头像拉取（`graph.microsoft.com` 为**硬编码外部地址** · 与建号/审计无关） */
      disableProfilePhoto: true,
    },
  },
});
const app = createApp({
  db: db as never,
  audit: createAuditWriter(db as never),
  ldap: null,
  storage: createLocalStorage(STORAGE_DIR),
  auth,
});

console.log(`=== M4c-3 L5 · Entra 假 issuer 全流程（假 IdP ${fakeBase} · base ${BASE}）===\n`);

/** 走一轮完整 OAuth（返回关键读数）；`badIssuer=true` 时假 IdP 发「他人租户」的 iss */
async function runFlow(opts: {
  oid: string;
  email: string;
  badIssuer?: boolean;
  omitOid?: boolean;
}) {
  cur.oid = opts.oid;
  cur.email = opts.email;
  cur.badIssuer = opts.badIssuer ?? false;
  cur.omitOid = opts.omitOid ?? false;

  const r1 = await app.request(`${BASE}/api/auth/sign-in/social`, {
    method: 'POST',
    headers: { origin: BASE, 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'microsoft', callbackURL: '/' }),
  });
  const j1 = (await r1.json()) as { url?: string; redirect?: boolean };
  const stateCookies = r1.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');

  const authz = await fetch(j1.url ?? '', { redirect: 'manual' });
  const callbackUrl = authz.headers.get('location') ?? '';
  const r3 = await app.request(callbackUrl, {
    headers: { origin: BASE, cookie: stateCookies },
  });
  const body = await r3.text();
  return {
    status1: r1.status,
    authzUrl: j1.url ?? '',
    authzStatus: authz.status,
    callbackUrl,
    status3: r3.status,
    location3: r3.headers.get('location') ?? '',
    sessionCookie:
      r3.headers.getSetCookie().find((c) => c.startsWith('better-auth.session_token=')) ?? '',
    body: body.slice(0, 200),
    stateCookiesLen: stateCookies.length,
  };
}
const succeeded = (f: Awaited<ReturnType<typeof runFlow>>) =>
  f.status3 === 302 &&
  (f.location3 === '/' || f.location3.startsWith(BASE)) &&
  !f.location3.includes('error') &&
  !!f.sessionCookie;

/* ── L1 / L2 / L3：主流程 ── */
const OID = `l5-oid-${randomUUID()}`;
const EMAIL = `l5-probe-${randomUUID()}@m4c3.test`;
const f1 = await runFlow({ oid: OID, email: EMAIL });
ok(
  'L1 授权 URL 指向**假 authority** + 本租户路径',
  f1.authzUrl.startsWith(`${fakeBase}/${TENANT}/oauth2/v2.0/authorize`),
  `url=${f1.authzUrl.slice(0, 96)}`,
);
ok(
  'L2 假 IdP 三端点健康（authorize 302 ⇒ 回调带 code/state）',
  f1.authzStatus === 302 && f1.callbackUrl.includes('code=') && f1.callbackUrl.includes('state='),
  `authzStatus=${f1.authzStatus} cb=${f1.callbackUrl.split('?')[0]}`,
);
ok(
  'L3 回调成功 ⇒ 302 回 `callbackURL` + 官方会话 cookie 下发',
  succeeded(f1),
  `status=${f1.status3} location=${f1.location3} cookie=${f1.sessionCookie ? 'yes' : 'no'}`,
);

/* ── L4 / L5 / L6 / L7：真库三件（user / account / 两条审计） ── */
const users = await rows('select id, email, name, email_verified from "user" where email = $1', [
  EMAIL,
]);
const uid = (users[0]?.id as string) ?? '';
ok('L4 建号：`user` 行按 id_token 的 email/name 落地', users.length === 1, `rows=${users.length}`);
const accs = await rows('select account_id, provider_id, user_id from account where user_id = $1', [
  uid,
]);
ok(
  'L5 账号链接：`(providerId, accountId)` = (`microsoft`, id_token `oid`) 绑到新用户',
  accs.length === 1 && accs[0].provider_id === 'microsoft' && accs[0].account_id === OID,
  `rows=${accs.length} provider=${String(accs[0]?.provider_id)} account=${String(accs[0]?.account_id)}`,
);
const prov = await rows(
  `select actor_id, target_id, detail from audit_log
    where action = 'external.provisioned' and target_id = $1`,
  [uid],
);
const provDetail = (prov[0]?.detail ?? {}) as { provider?: string; via?: string };
ok(
  'L6 建号审计（`account.create.after` 钩子）：`external.provisioned` 1 行 · detail 带 provider',
  prov.length === 1 && provDetail.provider === 'microsoft' && provDetail.via === 'oauth/callback',
  `rows=${prov.length} detail=${JSON.stringify(provDetail)}`,
);
const logins = await rows(
  `select actor_id, detail from audit_log
    where action = 'auth.login.success' and actor_id = $1
      and detail->>'via' = 'oauth/callback'`,
  [uid],
);
ok(
  'L7 登录审计（**app 层包装**）：`auth.login.success` 1 行 · detail.provider=microsoft',
  logins.length === 1 && (logins[0].detail as { provider?: string }).provider === 'microsoft',
  `rows=${logins.length} detail=${JSON.stringify(logins[0]?.detail ?? {})}`,
);

/* ── L8 二次登录：复用不重复建号 ── */
const f2 = await runFlow({ oid: OID, email: EMAIL });
const users2 = await rows('select id from "user" where email = $1', [EMAIL]);
const prov2 = await rows(
  `select id from audit_log where action = 'external.provisioned' and target_id = $1`,
  [uid],
);
ok(
  'L8 二次登录（同 oid）：成功复用 ⇒ **不重复建号**（user 1 行 · provisioned 仍 1 行）',
  succeeded(f2) && users2.length === 1 && prov2.length === 1,
  `user=${users2.length} provisioned=${prov2.length} status=${f2.status3}`,
);

/* ── L9 **反证**：官方真守卫 —— id_token 缺 `oid` ⇒ `getUserInfo` 返回 null ⇒ 拒绝 ── */
const NOOID_EMAIL = `l5-nooid-${randomUUID()}@m4c3.test`;
const f3 = await runFlow({ oid: `l5-oid-${randomUUID()}`, email: NOOID_EMAIL, omitOid: true });
const noOidUsers = await rows('select id from "user" where email = $1', [NOOID_EMAIL]);
ok(
  'L9 **反证**：id_token 缺 `oid` ⇒ 官方拒绝（非成功落点 · 无会话 cookie · 该 email 零建号）',
  !succeeded(f3) && noOidUsers.length === 0,
  `status=${f3.status3} location=${f3.location3.slice(0, 60)} user=${noOidUsers.length} cookie=${f3.sessionCookie ? 'yes' : 'no'}`,
);

/* ── L9b 行为记录（**F320**）：iss 换他人租户 ⇒ 代码流**仍成功** ⇒ 官方代码流不校验 id_token 的 iss ── */
const BAD_EMAIL = `l5-badiss-${randomUUID()}@m4c3.test`;
const f4 = await runFlow({ oid: `l5-oid-${randomUUID()}`, email: BAD_EMAIL, badIssuer: true });
const badUsers = await rows('select id from "user" where email = $1', [BAD_EMAIL]);
ok(
  'L9b 行为记录（F320 · **非期望断言**）：iss = 他人租户 ⇒ 代码流仍成功（官方仅 `decodeJwt` 取 claims，不校 iss）',
  succeeded(f4) && badUsers.length === 1,
  `status=${f4.status3} user=${badUsers.length} —— 与 design §6 L5「tenantId 非 common 时官方校验 issuer」口径不符（该口径只适用于 idToken 登录路径）`,
);

/* ── L10 清理自建行（FK 序：audit_log → session → account → user）+ 复核 ── */
const PROBE_EMAILS = [EMAIL, NOOID_EMAIL, BAD_EMAIL];
const ids = (await rows('select id from "user" where email = any($1)', [PROBE_EMAILS]))
  .map((r) => r.id as string)
  .filter(Boolean);
const verBefore = (await rows('select count(*)::int as n from verification'))[0]?.n as number;
type Del = { rowCount?: number };
const delAudit = (await pool.query(
  'delete from audit_log where actor_id = any($1) or target_id = any($1)',
  [ids],
)) as Del;
const delSess = (await pool.query('delete from session where user_id = any($1)', [ids])) as Del;
const delAcc = (await pool.query('delete from account where user_id = any($1)', [ids])) as Del;
const delUser = (await pool.query('delete from "user" where id = any($1)', [ids])) as Del;
const left = await rows('select id from "user" where email = any($1)', [PROBE_EMAILS]);
const verAfter = (await rows('select count(*)::int as n from verification'))[0]?.n as number;
ok(
  'L10 清理复核：探针 user 归零（audit_log → session → account → user 按 FK 序删）',
  left.length === 0 && ids.length >= 1,
  `删 audit=${delAudit.rowCount ?? '?'} session=${delSess.rowCount ?? '?'} account=${delAcc.rowCount ?? '?'} user=${delUser.rowCount ?? '?'} · 残留 user=${left.length}`,
);
if (verBefore !== verAfter) {
  console.log(
    `  ⚠ verification 表计数变化：${verBefore} → ${verAfter}（OAuth state 落库策略 · 需一并清理）`,
  );
}

/* ── 汇总 ── */
console.log(`\nM4C-3 L5 FAKE ISSUER: ${pass} PASS / ${fail} FAIL`);
idp.close();
await pool.end();
process.exit(fail === 0 ? 0 : 1);
