import { APIError, createAuthEndpoint, formCsrfMiddleware } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { AUDIT_ACTIONS, type AuditWriter, auditMetaFromHeaders } from '../../audit/audit.js';
import type { Db } from '../../db/client.js';
import { account, user } from '../../db/schema/index.js';
import { type AuthErrorCode, httpStatusFor } from '../errors.js';
import { type AccountRow, createIdentityRules } from '../identity.js';
import type { LdapChannel } from '../ldap.js';
import type { RateLimiter } from '../rate-limit.js';
import { accountRoleOf } from '../roles.js';

/**
 * 企业目录凭证插件（M4b-pre design §1.4 R12/R13/R15 · §2.2）——本批**唯一自绘件**。
 *
 * **为什么必须自绘**：官方零支持「用企业目录（LDAP/AD）bind 结果换官方会话」这一形态——
 * 官方 `emailAndPassword.password.verify({ password, hash })` 钩子**拿不到用户名**，
 * 无法在钩子里做目录 bind（design §1.4）。因此只走官方**文档化扩展点**
 * `createAuthEndpoint`（`docs/plugins.md`：写操作 POST、路径带插件语义前缀）。
 *
 * 两个端点：
 * - `POST /api/auth/sign-in/aih`（**公开**）：单表单三路分派（design R15）——
 *   ① 保留本地账号（`account.provider_id='credential'` 命中）→ 本地口令校验（逃生通道）
 *   ② 目录 bind 成功 → 建号/复用（`provider_id='ldap'`，`account_id` = 工号）+ 显示名同步
 *   ③ 目录不可达 + 本地有凭证 → 回退本地
 * - `POST /api/auth/sign-in/aih-oidc`（**仅服务端可达**）：OIDC 授权码流完成后的会话签发接缝
 *   （R11：编排仍留在 `http/oidc-routes.ts`，本端点只做「外部身份 → 官方会话」）。
 *
 * **服务端唯一性**的判定口径与官方 api-key 插件同源（design X5 实证）：
 * `ctx.request || ctx.headers` 任一存在即视为「客户端可达」⇒ 拒绝。
 *
 * 会话签发一律走官方内部件（`internalAdapter.createSession` + `setSessionCookie`）——
 * cookie 名/签名算法/TTL 全由官方管理，**本文件不实现任何密码学**。密码仍是既有 scrypt，
 * 经 `authOptions().emailAndPassword.password` 注入官方 ⇒ 这里的 verify 验的就是存量哈希（R10 零重置）。
 *
 * 响应契约（登录成功）：`200 { user: { id, displayName, email, role }, session: { id, expiresAt } }`
 * （`role` = 数值档位，与 `GET /api/auth/me` 同口径）；错误一律 `{code, message}`（07 §4）。
 */

/** 本地登录名归一（P7：trim + lowercase；与既有 `users.ts` 语义逐字一致） */
export function normalizeLoginName(raw: string): string {
  return raw.trim().toLowerCase();
}

/** 端点 ctx（官方端点上下文；`setSessionCookie` 的入参类型即完整面） */
type AuthEndpointCtx = Parameters<typeof setSessionCookie>[0];

export interface DirectoryCredentialsDeps {
  db: Db;
  /** LDAP 通道（`LDAP_ENABLED=false` → null：纯本地模式仍可登录） */
  ldap: LdapChannel | null;
  audit: AuditWriter;
  /** 登录限流（05 §3.1 匿名低频窗口防爆破；与官方 `/api/auth/*` 限流叠加，不互相替代） */
  rateLimiter: RateLimiter;
}

const signInBody = z.object({
  username: z.string().trim().min(1).max(256),
  password: z.string().min(1).max(1024),
});

const oidcBody = z.object({
  /** 外部身份 subject（OIDC `sub`） */
  subject: z.string().min(1).max(256),
  displayName: z.string().trim().min(1).max(128),
  /** 仅 `email_verified=true` 时由调用方传入（防未验证邮箱冒用） */
  email: z.string().email().max(256).nullable(),
});

/** 本地口令行（`credential` provider ∪ `AccountRow`） */
interface LocalCredentialRow extends AccountRow {
  passwordHash: string | null;
}

/**
 * D9 防时序枚举：无凭据也执行一次 verify（内容任意、格式合法即可），
 * 抹平「用户不存在 vs 密码错」的耗时差（scrypt 参数自描述，不需要真实口令）。
 */
const DUMMY_PASSWORD_HASH =
  '$scrypt$131072$8$1$c2FsdC1kdW1teS1zYWx0LXNhbHQtc2FsdA==$aXMtbm90LWEtcmVhbC1oYXNoLWJ1dC12ZXJpZnktcnVucw==';

const LOCAL_PROVIDER = 'credential';
const LDAP_PROVIDER = 'ldap';
const OIDC_PROVIDER = 'oidc';

export function directoryCredentials(deps: DirectoryCredentialsDeps) {
  const { db, ldap, audit, rateLimiter } = deps;
  /** 共享身份规则（M4c-1 §3.4/批 design §5.4：本文件不再自持建号/复用规则） */
  const identity = createIdentityRules({ db });

  /** 我们的结构化错误（07 §4：`{code, message}`；状态码语义见 `httpStatusFor`） */
  function fail(ctx: AuthEndpointCtx, code: AuthErrorCode): never {
    throw ctx.error(httpStatusFor(code), { message: code, code });
  }

  /** 本地凭证行（按登录名命中 `credential` provider） */
  async function findLocalCredential(loginName: string): Promise<LocalCredentialRow | null> {
    const rows = await db
      .select({
        id: user.id,
        passwordHash: account.password,
        displayName: user.name,
        email: user.email,
        status: user.status,
        role: user.role,
      })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id))
      .where(and(eq(account.providerId, LOCAL_PROVIDER), eq(account.accountId, loginName)))
      .limit(1);
    return rows[0] ?? null;
  }

  /** 官方会话签发（官方内部件）——返回会话摘要供响应体使用 */
  async function issueSession(
    ctx: AuthEndpointCtx,
    userId: string,
  ): Promise<{ id: string; expiresAt: Date }> {
    const session = await ctx.context.internalAdapter.createSession(userId, false);
    const officialUser = await ctx.context.internalAdapter.findUserById(userId);
    if (!officialUser) {
      throw new Error('directory credentials: session issued for unknown user');
    }
    await setSessionCookie(ctx, { session, user: officialUser });
    return { id: session.id, expiresAt: session.expiresAt };
  }

  return {
    id: 'aih-directory-credentials',
    endpoints: {
      /** 单表单登录（公开）：登录名 + 密码；三路分派（design R15） */
      signInAih: createAuthEndpoint(
        '/sign-in/aih',
        /**
         * `formCsrfMiddleware` = 官方 CSRF/Origin 中间件（官方内建登录端点同款装配）。
         * 必要性（源码实测 `api/middlewares/origin-check.mjs:108`）：全局 `originCheckMiddleware`
         * **仅当请求带 cookie 时才校验 Origin**；`formCsrfMiddleware` 在「有 Origin/Referer 头但无 cookie」
         * 时也强校验（`validateOrigin(ctx, true)`），正是「无会话的登录请求」这一面所必需的。
         */
        { method: 'POST', body: signInBody, use: [formCsrfMiddleware] },
        async (ctx) => {
          const loginName = normalizeLoginName(ctx.body.username);
          const password = ctx.body.password;
          const meta = auditMetaFromHeaders(ctx.headers ?? ctx.request?.headers);

          // 匿名低频窗口（05 §3.1）
          const limit = rateLimiter.hit(`${loginName}|${meta.clientIp ?? 'local'}`);
          if (!limit.allowed) {
            // 必须 `throw APIError`：better-call 的 `ctx.json(json, {status})` 在 HTTP 路由下
            // 只回 `json`（routerResponse 仅 `asResponse` 调用时生效，源码 context.mjs:70-76）
            // ⇒ 用它设状态会静默返回 200（实测踩坑）。retry-after 走 APIError 的 headers 位。
            throw new APIError(
              429,
              { code: 'auth.rate_limited', message: 'too many login attempts' },
              { 'retry-after': String(limit.retryAfterSec) },
            );
          }

          const auditLogin = async (entry: {
            actorId?: string | null;
            ok: boolean;
            code?: string;
            detail?: Record<string, unknown>;
          }): Promise<void> => {
            await audit({
              ...meta,
              actorId: entry.actorId ?? null,
              action: entry.ok ? AUDIT_ACTIONS.loginSuccess : AUDIT_ACTIONS.loginFailed,
              targetType: 'user',
              targetId: entry.actorId ?? undefined,
              detail: entry.ok ? entry.detail : { username: loginName, code: entry.code },
            });
          };

          /** 本地口令路径（逃生账号 · 纯本地模式 · 目录回退共用） */
          const localSignIn = async (
            row: LocalCredentialRow,
            via: 'local' | 'fallback',
          ): Promise<unknown> => {
            const gate = identity.statusError(row.status);
            if (gate) {
              await auditLogin({ ok: false, code: gate });
              fail(ctx, gate);
            }
            const ok = await ctx.context.password.verify({
              hash: row.passwordHash ?? '',
              password,
            });
            if (!ok) {
              await auditLogin({ ok: false, code: 'auth.invalid_credentials' });
              fail(ctx, 'auth.invalid_credentials');
            }
            await auditLogin({ actorId: row.id, ok: true, detail: { via } });
            const session = await issueSession(ctx, row.id);
            return ctx.json({
              user: {
                id: row.id,
                displayName: row.displayName,
                email: row.email,
                role: accountRoleOf(row.role),
              },
              session,
            });
          };

          // —— ① 保留本地账号（命中即走本地，不查目录；逃生通道） ——
          const local = await findLocalCredential(loginName);
          if (local) return localSignIn(local, 'local');

          // —— ② 目录通道 ——
          if (ldap) {
            const result = await ldap.authenticate(loginName, password);
            if (result.status === 'denied') {
              await auditLogin({ ok: false, code: 'auth.ldap_denied' });
              fail(ctx, 'auth.ldap_denied');
            }
            if (result.status === 'ok') {
              const ensured = await identity.ensureDirectoryUser({
                provider: LDAP_PROVIDER,
                subject: result.identity.userId,
                displayName: result.identity.displayName,
                email: result.identity.email,
                userId: result.identity.userId,
              });
              if (!ensured.ok) {
                await auditLogin({ ok: false, code: ensured.code });
                fail(ctx, ensured.code);
              }
              if (ensured.created) {
                await audit({
                  ...meta,
                  actorId: ensured.account.id,
                  action: AUDIT_ACTIONS.provisionLdap,
                  targetType: 'user',
                  targetId: ensured.account.id,
                  detail: { provider: LDAP_PROVIDER },
                });
              }
              await auditLogin({ actorId: ensured.account.id, ok: true, detail: { via: 'ldap' } });
              const session = await issueSession(ctx, ensured.account.id);
              return ctx.json({
                user: {
                  id: ensured.account.id,
                  displayName: ensured.account.displayName,
                  email: ensured.account.email,
                  role: accountRoleOf(ensured.account.role),
                },
                session,
              });
            }
            // unreachable → 落 ③ 回退
          }

          // —— ③ 纯本地模式 / 目录不可达回退 ——
          if (local) return localSignIn(local, 'fallback');
          // 无凭据：dummy verify 抹时序（D9）后统一 invalid_credentials（不泄露账号是否存在）
          await ctx.context.password.verify({ hash: DUMMY_PASSWORD_HASH, password });
          await auditLogin({ ok: false, code: 'auth.invalid_credentials' });
          return fail(ctx, 'auth.invalid_credentials');
        },
      ),

      /** OIDC 完成后的会话签发（仅服务端可达；openid-client 编排在 `http/oidc-routes.ts`） */
      signInAihOidc: createAuthEndpoint(
        '/sign-in/aih-oidc',
        { method: 'POST', body: oidcBody },
        async (ctx) => {
          if (ctx.request || ctx.headers) return fail(ctx, 'auth.forbidden');

          const ensured = await identity.ensureDirectoryUser({
            provider: OIDC_PROVIDER,
            subject: ctx.body.subject,
            displayName: ctx.body.displayName,
            email: ctx.body.email,
            userId: `usr_oidc_${crypto.randomUUID()}`,
          });
          if (!ensured.ok) return fail(ctx, ensured.code);

          const session = await issueSession(ctx, ensured.account.id);
          return ctx.json({
            created: ensured.created,
            user: {
              id: ensured.account.id,
              displayName: ensured.account.displayName,
              email: ensured.account.email,
              role: accountRoleOf(ensured.account.role),
            },
            session,
          });
        },
      ),
    },
  };
}
