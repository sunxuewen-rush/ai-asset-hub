import { z } from 'zod';

/**
 * 服务端环境配置（zod parse）。T17 将扩展为认证全集；
 * 当前为 T10 最小集，`getEnv` 惰性单例——测试无 env 时不受阻。
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  return envSchema.parse(source);
}

let cached: Env | undefined;
/** 惰性单例：首次访问解析（db client 惰性初始化依赖此） */
export function getEnv(): Env {
  cached ??= parseEnv();
  return cached;
}
