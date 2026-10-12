import { APIError, createAuthMiddleware, formCsrfMiddleware } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { AUDIT_ACTIONS, type AuditWriter, auditMetaFromHeaders } from '../../audit/audit.js';
import type { Db } from '../../db/client.js';
import { user } from '../../db/schema/index.js';
import { createIdentityRules } from '../identity.js';
import type { LdapChannel } from '../ldap.js';
import { DIRECTORY_CREDENTIAL_PREFIX } from '../password-verify.js';

/**
 * 企业目录凭证插件（M4b-pre design §1.4 R12/R13/R15 · §2.2）——本批**唯一自绘件**。
 *
 * **为什么必须自绘**：官方零支持「用企业目录（LDAP/AD）bind 结果换官方会话」这一形态——
 * 官方 `emailAndPassword.password.verify({ password, hash })` 钩子**拿不到用户名**，
 * 无法在钩子里做目录 bind（design §1.4）。因此只走官方**文档化扩展点**
 * `createAuthMiddleware` 钩子（`hooks.before` / `hooks.after` —— 本仓零自绘端点）。
 *
 * **端点**：本插件**已无自绘端点**（原自绘 OIDC 会话接缝端点随 M4c-3 退役删除）——
 * 现只以官方扩展点挂**钩子**（下述 `hooks.before` / `hooks.after`）。
 *
 * **官方登录端点的两个钩子（M4c-1 T3 / T6）**：
 * - `hooks.before`：CSRF/Origin 平价（官方 `formCsrfMiddleware`）+ 首登建号（不短路）
 * - `hooks.after`：登录成败审计（官方 `/sign-in/username` 成唯一口令登录入口后的审计承接 · F282）
 *
 * （原自绘 `POST /api/auth/sign-in/aih` 三路分派端点已于 **M4c-1 T6** 退役：本地口令走官方
 * `sign-in/username` + T2 的 `password-verify.ts` 分派；目录首登走 `hooks.before`；登录限流交
 * 官方 `rateLimit`（`enabled: isProduction`，内置 `/sign-in*` 规则）——自绘限流实例随之下线。）
 *
 * **服务端唯一性**：原以 `ctx.request || ctx.headers` 判「客户端可达 ⇒ 拒绝」（design X5 口径）的
 * 自绘端点已随 M4c-3 退役 ⇒ 本插件**现无任何客户端可达面**（纯钩子）。
 *
 * 会话签发一律由官方端点内建完成（cookie 名/签名算法/TTL 全由官方管理），**本文件不实现任何密码学**。
 * 密码仍是既有 scrypt，经 `authOptions().emailAndPassword.password` 注入官方 ⇒
 * 这里的 verify 验的就是存量哈希（R10 零重置）。
 *
 * **M4c-1 T3 增补**：本插件另挂官方 `sign-in/username` 的 **before 钩子**（首登建号，**不短路**）——
 * 登录名在本仓无对应用户 ⇒ 目录 bind ⇒ 成功则经共享模块建号 + 补凭据委派行，随后交回官方端点常规流程
 * （官方钩子在端点中间件之前运行 ⇒ 短路会绕过 Origin/CSRF ⇒ 本钩子**绝不返回响应**；主 design §2.5 / **F275**）。
 *
 */

/** 本地登录名归一（P7：trim + lowercase；与既有 `users.ts` 语义逐字一致） */
export function normalizeLoginName(raw: string): string {
  return raw.trim().toLowerCase();
}

export interface DirectoryCredentialsDeps {
  db: Db;
  /** LDAP 通道（`LDAP_ENABLED=false` → null：纯本地模式仍可登录） */
  ldap: LdapChannel | null;
  audit: AuditWriter;
}

/**
 * 官方 `sign-in/username` 端点前置校验（真码 `dist/plugins/username/index.mjs`：`minUsernameLength ?? 3` /
 * `maxUsernameLength ?? 30` / `defaultUsernameValidator = /^[a-zA-Z0-9_.]+$/`）。
 * T3 的 before 钩子用它做**同口径**护栏：不合规登录名不介入，避免「先建号、再被官方 422 拒」的孤儿账号（**F281**）。
 */
const OFFICIAL_USERNAME_MIN = 3;
const OFFICIAL_USERNAME_MAX = 30;
const OFFICIAL_USERNAME_VALIDATOR = /^[a-zA-Z0-9_.]+$/;
const LDAP_PROVIDER = 'ldap';

export function directoryCredentials(deps: DirectoryCredentialsDeps) {
  const { db, ldap, audit } = deps;
  /** 共享身份规则（M4c-1 §3.4/批 design §5.4：本文件不再自持建号/复用规则） */
  const identity = createIdentityRules({ db });

  return {
    id: 'aih-directory-credentials',
    /**
     * M4c-1 T3（批 design §5.3 · B4）：官方 `sign-in/username` 的 **before 钩子** —— 首登建号。
     *
     * 官方机制（真码实测 `api/dispatch.mjs:157-165` 合并 + `:210-231` 先于端点 handler 与其中间件）：
     * 返回响应对象会**短路**掉官方端点 ⇒ 绕过其 Origin / CSRF（主 design §2.5 / **F275**）
     * ⇒ 本钩子**只建号、绝不返回响应**。
     *
     * 时序：钩子目录 bind（建号）→ 官方端点查 user ⇒ `findCredentialAccount`（凭据委派行）
     * ⇒ `password.verify` 落到 T2 分派（`ldap:` 前缀 ⇒ 再 bind 一次）⇒ 官方签发会话。
     */
    hooks: {
      before: [
        {
          /**
           * **首条 = CSRF / Origin 平价（F283 · 用户拍板「甲」）**：登录请求（**无 cookie**）时官方全局
           * `originCheckMiddleware` 会**直接放行**（真码 `api/middlewares/origin-check.mjs`：
           * `validateOrigin` 内 `if (!(forceValidate || useCookies)) return;`），而补这一层的官方
           * `formCsrfMiddleware` **未挂**在官方 `/sign-in/username`（`username` 插件端点缺口）⇒ 以**官方件**
           * 把它补到官方登录面（本仓零自绘中间件）。
           *
           * 必须排在建号钩子**之前**（数组顺序 = 执行顺序）⇒ CSRF 不通过时**零建号副作用**。
           * 覆盖面 = 整个登录面（`/sign-in/*`；`/sign-in/username` 为 M4c-1 采纳端点，email/social 同族同缺口）。
           * 非登录面（`/device/*` 等）不匹配；`formCsrfMiddleware` 自身对 GET/HEAD/OPTIONS 早退（真码同文件）。
           */
          matcher: (ctx: { path?: string }) => Boolean(ctx.path?.startsWith('/sign-in/')),
          handler: formCsrfMiddleware,
        },
        {
          // 入参类型取官方 `HookEndpointContext` 的**结构子集**（只用到 `path`）：官方该类型定义在传递包
          // `@better-auth/core`，`better-auth/api` 未再导出（实测）⇒ 不引传递包、按结构最小标注。
          matcher: (ctx: { path?: string }) => ctx.path === '/sign-in/username',
          handler: createAuthMiddleware(async (ctx) => {
            // 官方端点自行校验的字段：缺任一 ⇒ 零介入（由它给 401/422）
            const body = ctx.body as { username?: string; password?: string } | undefined;
            if (!body?.username || !body.password) return;
            if (!ldap) return; // 纯本地模式：无目录可 bind，零介入

            const loginName = normalizeLoginName(body.username);
            // 官方端点同口径护栏（F281）：不合规登录名不介入，避免「先建号、再被官方 422 拒」的孤儿账号
            if (
              loginName.length < OFFICIAL_USERNAME_MIN ||
              loginName.length > OFFICIAL_USERNAME_MAX ||
              !OFFICIAL_USERNAME_VALIDATOR.test(loginName)
            ) {
              return;
            }

            // 触发条件（批 design §5.3）：登录名在本仓**无对应用户**；已有用户 ⇒ 零介入
            const existing = await db
              .select({ id: user.id })
              .from(user)
              .where(eq(user.username, loginName))
              .limit(1);
            if (existing.length > 0) return;

            const result = await ldap.authenticate(loginName, body.password);
            if (result.status !== 'ok') return; // 不建号、不返回 ⇒ 官方端点给统一失败响应（不泄露存在性）

            const ensured = await identity.ensureDirectoryUser({
              provider: LDAP_PROVIDER,
              subject: result.identity.userId,
              displayName: result.identity.displayName,
              email: result.identity.email,
              userId: result.identity.userId,
              // 凭据委派行（批 design §5.1）：与 user / 外部身份行同事务 ⇒ 无「半途失败永久 401」窗口
              delegatedPassword: `${DIRECTORY_CREDENTIAL_PREFIX}${result.identity.userId}`,
            });
            if (!ensured.ok) return; // 邮箱缺失/冲突等：同样交官方端点给统一失败响应

            if (ensured.created) {
              await audit({
                ...auditMetaFromHeaders(ctx.headers ?? ctx.request?.headers),
                actorId: ensured.account.id,
                action: AUDIT_ACTIONS.provisionLdap,
                targetType: 'user',
                targetId: ensured.account.id,
                detail: { provider: LDAP_PROVIDER, via: 'sign-in/username' },
              });
            }
            // 不返回响应（不短路）：官方端点中间件（Origin / CSRF）与常规登录流程照常执行
          }),
        },
      ],
      /**
       * M4c-1 T6（**F282 收口**）：登录成败审计 —— 官方 `/sign-in/username` 成为**唯一**口令登录入口后，
       * 审计面由本钩子承接（官方端点自身不写 `auth.login.*` —— 本仓唯一的登录审计写入点即此处）。
       *
       * 官方机制（真码 `api/dispatch.mjs:234-245`）：handler 抛 `APIError` 时先被收敛成 `{ response, status }`，
       * **之后仍执行 after 钩子** ⇒ 成败两态在此可判（`ctx.context.returned` = 成功响应体 / `APIError` 实例）。
       * F276「after 钩子改不了状态码」与本用途无关——本钩子**只读不写**：不构造响应、不改状态。
       *
       * 覆盖面说明：官方限流（`onRequestRateLimit`，先于钩子执行）与 before 阶段的 CSRF / Origin 拦截
       * 都会**提前返回、不进 after** ⇒ 被拦请求不产生 `auth.login.*` 行（与退役前「限流门之前不写审计」同口径）。
       */
      after: [
        {
          matcher: (ctx: { path?: string }) => ctx.path === '/sign-in/username',
          handler: createAuthMiddleware(async (ctx) => {
            const returned = (ctx.context as { returned?: unknown } | undefined)?.returned;
            const failed = returned instanceof APIError;
            const signedIn = failed
              ? undefined
              : (returned as { user?: { id?: string } } | undefined)?.user;
            const body = ctx.body as { username?: string } | undefined;
            await audit({
              ...auditMetaFromHeaders(ctx.headers ?? ctx.request?.headers),
              actorId: signedIn?.id ?? null,
              action: failed ? AUDIT_ACTIONS.loginFailed : AUDIT_ACTIONS.loginSuccess,
              targetType: 'user',
              targetId: signedIn?.id ?? undefined,
              detail: failed
                ? {
                    username: normalizeLoginName(body?.username ?? ''),
                    code: (returned as { body?: { code?: string } } | undefined)?.body?.code,
                  }
                : { via: 'sign-in/username' },
            });
          }),
        },
      ],
    },
  };
}
