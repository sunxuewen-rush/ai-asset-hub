import { apiKey } from '@better-auth/api-key';
import { type Auth, type BetterAuthOptions, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, bearer, deviceAuthorization, username } from 'better-auth/plugins';
import { getEnv } from '../config/env.js';
import { getDb } from '../db/client.js';
import { hashPassword, verifyPassword } from './password.js';
import { ac, ROLES } from './roles.js';

/**
 * better-auth 实例装配（design §4.1「新增」表 · §2.2 目标架构）。
 *
 * 定位：**官方整车 + 薄适配层**——本文件只做「配置化接线」，不实现任何认证算法：
 * - 会话签发/校验/cookie/Origin 校验 → 官方内建（`better-auth.session_token`，`session` 表落库）
 * - 角色与权限码 → 官方 admin 插件 + 本项目 `roles.ts` 声明（R4）
 * - 密码哈希 → 官方配置化注入点（`emailAndPassword.password`），算法沿用本项目既有 scrypt（R10，存量零重置）
 * - 令牌 → 官方 api-key 插件（R7；**显式关闭官方默认限流**，否则会改掉既有令牌语义）
 * - 设备流 → 官方 device authorization 插件（R8）；设备 token 走 Bearer ⇒ 必须挂 `bearer` 插件
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
 * - 结论：**实例类型以官方导出的 `Auth` 命名**（`AihAuth = Auth`）；把 `authOptions()` 注解为官方
 *   `BetterAuthOptions` 后，`betterAuth()` 的返回值可直接赋给 `Auth`（**无需断言**，实测赋值成立）。
 *   代价 = 插件端点（api-key 的 `createApiKey` / `verifyApiKey` 等）不在 `Auth` 的 `api` 面上 ⇒
 *   需要在调用点做**局部窄化**（T5 落地，见 design §2.3 P6/P7：令牌签发本就要求服务端直呼）；
 *   核心端点 `getSession` 正常有类型。
 */

/** 实例选项（仅在构建实例时求值；env 惰性读取，导入期不解析） */
export function authOptions(): BetterAuthOptions {
  const env = getEnv();
  return {
    baseURL: env.PUBLIC_BASE_URL,
    secret: env.SESSION_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'pg' }),

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

    plugins: [
      /** 登录名（工号/本地登录名）唯一列 + 展示名（05 §2 身份标识） */
      username(),
      /** 4 档角色与权限码（R4） */
      admin({ ac, roles: ROLES, defaultRole: 'user' }),
      /** 设备流（R8：官方两段式契约） */
      deviceAuthorization(),
      /** 设备 token 以 Bearer 解析（实证：缺该插件则受保护端点 401） */
      bearer(),
      /** API 令牌（R7：官方默认 10 次/24h 限流会改掉既有语义 ⇒ 显式关闭；限流仍在下载/上传面） */
      apiKey({ rateLimit: { enabled: false } }),
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

let cached: AihAuth | undefined;

/** 惰性单例（与 `getEnv`/`getDb` 同风格：导入期不解析 env，测试可重置） */
export function getAuth(): AihAuth {
  cached ??= betterAuth(authOptions());
  return cached;
}

/** 测试用：清除缓存重建实例 */
export function resetAuthCache(): void {
  cached = undefined;
}
