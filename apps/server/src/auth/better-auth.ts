import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { apiKey } from '@better-auth/api-key';
import { type Auth, type BetterAuthOptions, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, bearer, deviceAuthorization, username } from 'better-auth/plugins';
import {
  AUDIT_ACTIONS,
  type AuditWriter,
  auditMetaFromHeaders,
  createAuditWriter,
} from '../audit/audit.js';
import { getEnv } from '../config/env.js';
import { getDb } from '../db/client.js';
import type { LdapChannel } from './ldap.js';
import { directoryCredentials } from './plugins/ldap-credentials.js';
import { InMemoryRateLimiter, type RateLimiter } from './rate-limit.js';
import { ac, ROLES } from './roles.js';
import { generateTokenSecret } from './tokens.js';

/**
 * better-auth 实例装配（design §4.1「新增」表 · §2.2 目标架构）。
 *
 * 定位：**官方整车 + 薄适配层**——本文件只做「配置化接线」，不自研认证算法：
 * - 会话签发/校验/cookie/Origin 校验 → 官方内建（`better-auth.session_token`，`session` 表落库）
 * - 角色与权限码 → 官方 admin 插件 + 本项目 `roles.ts` 声明（R4）
 * - 密码哈希 → 官方配置化注入点（`emailAndPassword.password`），算法沿用本项目既有 scrypt（R10 存量零重置）
 *   ——该算法函数体按 design §4.1 由原 `auth/password.ts` **迁入本文件**（文件已删）
 * - 令牌 → 官方 api-key 插件（R7；**显式关闭官方默认限流**，否则会改掉既有令牌语义）
 * - 设备流 → 官方 device authorization 插件（R8）；设备 token 走 Bearer ⇒ 必须挂 `bearer` 插件
 * - 企业目录登录 / OIDC 会话接缝 → 本批唯一自绘插件 `plugins/ldap-credentials.ts`（官方扩展点）
 *
 * 已实测坑（design §2.3 P1-P8）在本文件相关项：
 * - `drizzleAdapter` 的 drizzle 实例**必须带 schema**，否则运行期 `BetterAuthError(SCHEMA_MISMATCH)`
 *   （`db/client.ts` 的 `createClient` 已带 `{ schema }`）。
 * - 官方 CLI `auth generate` 用 jiti 加载配置：生成期 schema 尚未产出时会加载失败 ⇒ 生成期另用独立配置。
 *
 * 类型注记（实证，`declaration: true` 下踩到）：
 * - 选项/实例的**推断类型不可命名**——直接用 `ReturnType<typeof authOptions>` 之类会让编译器把
 *   zod / better-call 内部类型写进 `.d.ts`（TS2742）且超长（TS7056）；把选项注解成官方
 *   `BetterAuthOptions` 也修不掉（`Auth<BetterAuthOptions>` 与实例的 `$context` 是逆变的，赋值不成立）。
 * - 结论：**实例类型以官方导出的 `Auth` 命名**（`AihAuth = Auth`）；`authOptions()` 注解为官方
 *   `BetterAuthOptions` 后，`betterAuth()` 的返回值可直接赋给 `Auth`（**无需断言**，实测赋值成立）。
 *   代价 = 插件端点（api-key 的 `createApiKey` / `verifyApiKey` 等）不在 `Auth` 的 `api` 面上 ⇒
 *   需要在调用点做**局部窄化**（T5 落地，见 design §2.3 P6/P7：令牌签发本就要求服务端直呼）；
 *   核心端点 `getSession` 正常有类型。
 */

/** 装配期可注入的运行时依赖（测试注入 fake LDAP / 自定义审计与限流；生产走缺省） */
export interface AuthRuntimeDeps {
  /**
   * 官方 `advanced` 选项透传（**测试专用钩子**）。主要用途：断言 Origin 三态时必须显式
   * `{ disableOriginCheck: false }` —— 官方在 `NODE_ENV=test` 下默认跳过 Origin 校验
   * （源码 `context/create-context.mjs:211`：`skipOriginCheck = isTest() ? true : false`），
   * 生产/开发环境默认即开启（无需设置）。
   */
  advanced?: BetterAuthOptions['advanced'];
  /** LDAP 通道（缺省 = null ⇒ 纯本地模式；生产由 `index.ts` 按 `LDAP_ENABLED` 构造后传入） */
  ldap?: LdapChannel | null;
  audit?: AuditWriter;
  rateLimiter?: RateLimiter;
}

/** 登录限流缺省档（与旧 `index.ts` 装配同参：15 分钟窗口 / 20 次） */
const LOGIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 20 } as const;

/** 实例选项（仅在构建实例时求值；env 惰性读取，导入期不解析） */
export function authOptions(deps: AuthRuntimeDeps = {}): BetterAuthOptions {
  const env = getEnv();
  const db = getDb();
  const audit = deps.audit ?? createAuditWriter(db);
  return {
    ...(deps.advanced ? { advanced: deps.advanced } : {}),
    baseURL: env.PUBLIC_BASE_URL,
    secret: env.SESSION_SECRET,
    database: drizzleAdapter(db, { provider: 'pg' }),

    emailAndPassword: {
      enabled: true,
      /** 注册开关（05 §3：REGISTRATION_ENABLED；关闭 = 拒绝自助注册，官方端点不再建号） */
      disableSignUp: !env.REGISTRATION_ENABLED,
      /** R10：注入本项目既有 scrypt（`$scrypt$N$r$p$salt$hash` 自描述）⇒ 存量口令原样可验 */
      password: {
        hash: hashPassword,
        verify: ({ hash, password }: { hash: string; password: string }) =>
          verifyPassword(password, hash),
      },
    },

    session: {
      /** R6：8h 绝对过期（05 §5 既有安全档位；关滑动刷新 = 与既有语义一致） */
      expiresIn: env.SESSION_TTL_HOURS * 60 * 60,
      disableSessionRefresh: true,
    },

    /** R9：官方 Origin 校验白名单（空 = 仅同源；dev 填 web 源，生产留空靠反代同源） */
    trustedOrigins: parseTrustedOrigins(env.AUTH_TRUSTED_ORIGINS),

    user: {
      additionalFields: {
        /**
         * R5：账号状态**单值真值列**（05 §4.1 三态；服务端拥有——`input:false` 防客户端写入）。
         * 不使用官方 `banned` 列（布尔表达不了 PENDING，且双真值必然漂移）。
         */
        status: { type: 'string', required: false, defaultValue: 'ACTIVE', input: false },
      },
    },

    /**
     * 审计挂钩（官方 hooks 扩展点；design §2.2「审查/审计动作留痕」）：
     * - `databaseHooks.user.create.after`：官方自助注册（`sign-up/email`）落 `auth.register`
     * - 登出审计（`auth.logout`）**不在本文件**：官方 `hooks.after` 在 sign-out 路径取不到会话
     *   （会话行已被删除，实测）⇒ 由 `app.ts` 的官方 handler 包装层「先读会话 → 处理后补审计」承担
     * 目录/本地登录的成败审计在 `plugins/ldap-credentials.ts` 内（该处才有分派上下文）。
     */
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser, ctx) => {
            await audit({
              ...auditMetaFromHeaders(ctx?.headers),
              actorId: createdUser.id,
              action: AUDIT_ACTIONS.register,
              targetType: 'user',
              targetId: createdUser.id,
            });
          },
        },
      },
    },

    plugins: [
      /** 登录名（工号/本地登录名）唯一列 + 展示名（05 §2 身份标识） */
      username(),
      /** 4 档角色与权限码（R4） */
      admin({ ac, roles: ROLES, defaultRole: 'user' }),
      /**
       * 设备流（R8：官方两段式契约）。参数显式钉定（与官方默认同值，避免上游默认值漂移改变对外契约）：
       * - `expiresIn: '30m'` 设备码有效期（旧自研实现 10min → 官方默认 30m，design §8 登记）
       * - `interval: '5s'` 轮询下限（与旧实现一致；过快轮询官方回 `slow_down`）
       * - `verificationUri` 缺省 `/device`（官方按 `baseURL` 解析为绝对地址）⇒ 认证页由 M4b-2 提供
       */
      deviceAuthorization({ expiresIn: '30m', interval: '5s' }),
      /** 设备 token 以 Bearer 解析（实证：缺该插件则受保护端点 401） */
      bearer(),
      /**
       * API 令牌（R7 + T4 §5.3）：
       * - `rateLimit: enabled=false`：官方默认 10 次/24h 限流会改掉既有语义（限流仍在下载/上传面）
       * - `keyExpiration.maxExpiresIn=3650`（天）：保持既有 `POST /api/tokens { expiresInDays ≤ 3650 }` 契约
       *   （官方默认上限 365 天会拒掉既有合法请求）
       * - `customKeyGenerator`：明文形态保持 `aih_` + 43 位 base64url（官方扩展点；存储/校验仍全交官方）
       */
      apiKey({
        rateLimit: { enabled: false },
        /**
         * 过期边界（天，官方口径）：
         * - `maxExpiresIn: 3650` 保持 `POST /api/tokens { expiresInDays ≤ 3650 }` 契约（官方默认 365 会拒）
         * - `minExpiresIn: 1/24`（= 1 小时）容纳设备流令牌 TTL（`DEVICE_TOKEN_TTL_SEC = 3600`；
         *   官方默认最小 1 天会让设备令牌签发被拒——实测）
         * 路由层仍自行收紧用户签发下限（`expiresInDays ≥ 1`，zod）
         */
        keyExpiration: { maxExpiresIn: 3650, minExpiresIn: 1 / 24 },
        customKeyGenerator: () => generateTokenSecret(),
        /**
         * M4b-3 T2 · Key 掩码片段（官方 `apikey.start`，明文**前 N 位**，含 `aih_` 前缀）：
         * `charactersLength: 12` ⇒ `aih_` + 8 位随机（官方默认 6 只留 2 位随机，辨识度不足）。
         * 官方源码：`start = key.substring(0, charactersLength)`（`dist/index.mjs:808`，含前缀）。
         */
        startingCharactersConfig: { charactersLength: 12 },
        /**
         * M4b-3 T2 · 明文**后 4 位**片段存 `metadata.tail`（掩码用）：
         * 官方 `metadata` **默认关闭**（`enableMetadata` 默认 false）——签发时传 metadata 会抛
         * `METADATA_DISABLED`（`dist/index.mjs:767-770`），更新时则**静默忽略**（`:1511`）⇒ 必须显式开启。
         */
        enableMetadata: true,
        /**
         * 名称上限钉定官方默认 **32**（M4b-3 T2；`dist/index.mjs:2328`）——同文件先例：官方默认值显式钉定，
         * 防上游默认漂移改变对外契约（对齐 `deviceAuthorization` 的钉定注记）。
         */
        maximumNameLength: 32,
      }),
      /** 企业目录凭证（本批唯一自绘件；官方零支持槽位，官方扩展点内实现） */
      directoryCredentials({
        db,
        ldap: deps.ldap ?? null,
        audit,
        rateLimiter:
          deps.rateLimiter ??
          new InMemoryRateLimiter(LOGIN_RATE_LIMIT.windowMs, LOGIN_RATE_LIMIT.max),
      }),
    ],
  };
}

/** 实例类型（理由见文件头「类型注记」：官方 `Auth`；`authOptions` 已注解 ⇒ 无需断言） */
export type AihAuth = Auth;

/** 逗号分隔 origin 白名单解析（空串 → 空数组 = 仅同源） */
export function parseTrustedOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** 构建实例（app.ts / seed / 测试各自可注入依赖与 LDAP 通道；实例间互不共享状态） */
export function createAuth(deps: AuthRuntimeDeps = {}): AihAuth {
  return betterAuth(authOptions(deps));
}

let cached: AihAuth | undefined;

/** 惰性单例（与 `getEnv`/`getDb` 同风格：导入期不解析 env，测试可重置） */
export function getAuth(): AihAuth {
  cached ??= createAuth();
  return cached;
}

/* ────────────────────────── 口令哈希（原 `auth/password.ts` 迁入，design §4.1） ────────────────────────── */
/**
 * 密码哈希（R3）：node:crypto scrypt，零 native 依赖。
 * 存储格式：`$scrypt$N$r$p$<salt b64>$<hash b64>`（参数自描述，支持未来升级）。
 * 迁移语义（design R10）：存量 `local_credential.password_hash` 原样写入 `account.password`，
 * 本函数只在**新写入**时使用；校验永远按存储串自描述参数执行。
 */

// OWASP 推荐参数：N=2^17, r=8, p=1
const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SALT_LEN = 16;
// maxmem 必传：128·N·r ≈ 128 MiB > Node 默认 maxmem 32 MiB（不设会运行时报错）；2 倍裕量
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keylen,
      { N: n, r, p, maxmem: SCRYPT_MAXMEM },
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `$scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** 校验：格式解析失败返回 false（不抛），参数取自存储串（自描述） */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  // ['', 'scrypt', N, r, p, salt, hash] = 7 段
  if (parts.length !== 7 || parts[0] !== '' || parts[1] !== 'scrypt') return false;

  const n = Number(parts[2]);
  const r = Number(parts[3]);
  const p = Number(parts[4]);
  // N 必须为 >1 的 2 的幂（node:crypto 参数约束）
  if (!Number.isInteger(n) || n <= 1 || (n & (n - 1)) !== 0) return false;
  if (!Number.isInteger(r) || r < 1 || !Number.isInteger(p) || p < 1) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[5] ?? '', 'base64');
    expected = Buffer.from(parts[6] ?? '', 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scrypt(password, salt, expected.length, n, r, p);
  } catch {
    return false;
  }
  return timingSafeEqual(actual, expected);
}
