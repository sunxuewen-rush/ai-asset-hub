/**
 * 测试环境变量统一入口（config/env getEnv 全量 zod 校验——含 DATABASE_URL required）。
 * validate 等纯校验模块经 defaultZipLimits → getEnv 读取资产上限——测试进程需
 * 满足 config 完整性。各测试文件顶部 import + 调用（幂等——不覆盖已设值）。
 */
export function ensureTestEnv(): void {
  process.env.DATABASE_URL ??= 'postgres://aih:aih@localhost:5433/ai_asset_hub_test';
  process.env.SESSION_SECRET ??= 'x'.repeat(40);
}
