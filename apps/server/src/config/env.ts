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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // 会话（05 §5：服务端 Session，过期可配默认 8h）
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(8),

  // 注册与准入
  REGISTRATION_ENABLED: boolFromString.default('true'),
  ACCESS_POLICY: accessPolicySchema.default('open'),

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

  // 种子管理员（可选：设置则 db:seed 建 SUPER_ADMIN）
  SEED_ADMIN_USERNAME: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
export type AccessPolicy = z.infer<typeof accessPolicySchema>;

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
