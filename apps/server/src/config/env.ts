import { z } from 'zod';

/**
 * 服务端环境配置全集（05 §3.1 + §5 对应；zod 单源校验）。
 * 缺关键配置启动即拒（fail fast）；`getEnv` 惰性单例。
 */

const boolFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

/** 准入策略（05 §4）：M1 实现 open；其余枚举值接受但准入判定未实现时拒绝启动 */
export const accessPolicySchema = z.enum([
  'open',
  'provider_allowlist',
  'email_domain',
  'subject_whitelist',
]);

/** 存储驱动（R4：M1 只实现 local；s3 后置 M3——取值接受但启动拒绝，防静默误配） */
export const storageDriverSchema = z.enum(['local', 's3']);
export type StorageDriver = z.infer<typeof storageDriverSchema>;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // 会话（05 §5：服务端 Session，过期可配默认 8h）
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),

  // 注册与准入
  /**
   * 自助注册开关（05 §3 / 主 design R3）：**默认关闭**（M4c-1 T7 起）——
   * 企业内网账号由管理员/企业目录建立；显式 `REGISTRATION_ENABLED=true` 才开官方 `sign-up/*`。
   */
  REGISTRATION_ENABLED: boolFromString.default('false'),
  ACCESS_POLICY: accessPolicySchema.default('open'),

  // 对象存储（08 §5.3；M1 Local 实现，S3 后置 M3）
  STORAGE_DRIVER: storageDriverSchema.default('local'),

  // 资产包校验上限（02/03/04 §5 契约；**数值真源 = 本文件**，代码/注释不写死字节数）
  ASSET_PACKAGE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(100 * 1024 * 1024),
  ASSET_FILE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  ASSET_MAX_FILES: z.coerce.number().int().positive().default(100),
  STORAGE_DIR: z.string().default('./storage'),

  // 下载限流（M3 design §7.2 G9：60 次/分钟·IP——匿名公开下载面；env 可配）
  DOWNLOAD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  DOWNLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

  // label 定义总数上限（M3 D1：skillhub label.max-definitions:100 同构——env 可配 C7）
  LABEL_MAX_DEFINITIONS: z.coerce.number().int().positive().default(100),

  // 对外基址（作为官方 baseURL ⇒ 设备流 verification_uri / 回调地址以此为准）
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),

  // 外部身份源（M4c-3 §3.1：企业 IdP + 社交三通道；默认全关 ⇒ 独立部署零影响）
  // 企业 IdP = 官方内置 `microsoft`（Microsoft Entra ID，原 Azure AD）
  ENTRA_ENABLED: boolFromString.default('false'),
  ENTRA_CLIENT_ID: z.string().default(''),
  ENTRA_CLIENT_SECRET: z.string().default(''),
  /**
   * 租户 ID（M4c-3 G1：**必填**）。`ENTRA_ENABLED=true` 且本键为空 ⇒ 拒绝启动。
   * 官方缺省 `"common"` = 任何 Microsoft 账号（含个人账号）均可走通授权 ⇒
   * 自托管企业部署**必须收紧到本租户**（填具体租户时官方会校验 `issuer`）。
   */
  ENTRA_TENANT_ID: z.string().default(''),
  SOCIAL_GOOGLE_ENABLED: boolFromString.default('false'),
  SOCIAL_GOOGLE_CLIENT_ID: z.string().default(''),
  SOCIAL_GOOGLE_CLIENT_SECRET: z.string().default(''),
  SOCIAL_GITHUB_ENABLED: boolFromString.default('false'),
  SOCIAL_GITHUB_CLIENT_ID: z.string().default(''),
  SOCIAL_GITHUB_CLIENT_SECRET: z.string().default(''),
  SOCIAL_WECHAT_ENABLED: boolFromString.default('false'),
  SOCIAL_WECHAT_CLIENT_ID: z.string().default(''),
  SOCIAL_WECHAT_CLIENT_SECRET: z.string().default(''),

  // LDAP 企业通道（05 §3.1：默认关闭，独立部署不受影响）
  LDAP_ENABLED: boolFromString.default('false'),
  /** 逗号分隔多 DC（故障转移） */
  LDAP_URLS: z.string().default(''),
  /** auto = UPN → CN=user,base → 裸名 三重身份尝试，或固定模式 */
  LDAP_BIND_MODE: z.string().default('auto'),
  LDAP_USER_BASE: z.string().default(''),
  /** 建号 userId 来源属性（惯例 sAMAccountName/uid） */
  LDAP_USER_ID_ATTR: z.string().default('sAMAccountName'),
  LDAP_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // Origin 白名单（design §4.3 R9：官方 `trustedOrigins`；空 = 仅同源比对；
  // dev 填 web 源（如 http://localhost:5173），**生产留空**靠反代同源——官方文档同款告警口径）
  AUTH_TRUSTED_ORIGINS: z.string().default(''),

  // 种子管理员（可选：设置则 db:seed 建 SUPER_ADMIN）
  SEED_ADMIN_USERNAME: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  /**
   * bootstrap 管理员邮箱（design §5.2 R13：本地逃生账号无目录来源 ⇒ 本设计**唯一的合成邮箱点**）。
   * 默认 `admin@local.test`——`.test` 是 RFC 6761 保留 TLD，语义即「不可投递」；
   * 不可用 `admin@local`（实测官方校验直接拒：`Invalid email address.`）。
   */
  SEED_ADMIN_EMAIL: z.string().email().default('admin@local.test'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const env = envSchema.parse(source);
  // 准入策略非 open（M1 未实现）→ 拒绝启动，防静默误配
  if (env.ACCESS_POLICY !== 'open') {
    throw new Error(`ACCESS_POLICY=${env.ACCESS_POLICY} is not implemented in M1 (only 'open')`);
  }
  // LDAP 启用但未配 URLS → 拒绝（05 §3.1 配置完整性）
  if (env.LDAP_ENABLED && env.LDAP_URLS.trim() === '') {
    throw new Error('LDAP_ENABLED=true requires LDAP_URLS (comma-separated DC list)');
  }
  // 存储驱动非 local（M1 未实现）→ 拒绝启动，防静默误配（R4）
  if (env.STORAGE_DRIVER !== 'local') {
    throw new Error(`STORAGE_DRIVER=${env.STORAGE_DRIVER} is not implemented in M1 (only 'local')`);
  }
  // 外部身份源启用但缺凭据 → 拒绝（M4c-3 §3.1 fail-fast；同 LDAP 既有模式）
  const externalChannels: ReadonlyArray<readonly [string, boolean, string, string]> = [
    ['ENTRA', env.ENTRA_ENABLED, env.ENTRA_CLIENT_ID, env.ENTRA_CLIENT_SECRET],
    [
      'SOCIAL_GOOGLE',
      env.SOCIAL_GOOGLE_ENABLED,
      env.SOCIAL_GOOGLE_CLIENT_ID,
      env.SOCIAL_GOOGLE_CLIENT_SECRET,
    ],
    [
      'SOCIAL_GITHUB',
      env.SOCIAL_GITHUB_ENABLED,
      env.SOCIAL_GITHUB_CLIENT_ID,
      env.SOCIAL_GITHUB_CLIENT_SECRET,
    ],
    [
      'SOCIAL_WECHAT',
      env.SOCIAL_WECHAT_ENABLED,
      env.SOCIAL_WECHAT_CLIENT_ID,
      env.SOCIAL_WECHAT_CLIENT_SECRET,
    ],
  ];
  for (const [name, enabled, clientId, clientSecret] of externalChannels) {
    if (enabled && (clientId.trim() === '' || clientSecret.trim() === '')) {
      throw new Error(`${name}_ENABLED=true requires ${name}_CLIENT_ID and ${name}_CLIENT_SECRET`);
    }
  }
  // G1：Entra 启用但租户未收紧 → 拒绝（官方缺省 "common" 会放行任何 Microsoft 账号）
  if (env.ENTRA_ENABLED && env.ENTRA_TENANT_ID.trim() === '') {
    throw new Error('ENTRA_ENABLED=true requires ENTRA_TENANT_ID (pin to your tenant)');
  }
  return env;
}

let cached: Env | undefined;
/** 惰性单例：首次访问解析（测试可重置） */
export function getEnv(): Env {
  cached ??= parseEnv();
  return cached;
}

/** 测试用：清除缓存重新解析 */
export function resetEnvCache(): void {
  cached = undefined;
}
