/**
 * 直通扫描器（M3 design §3.2 R3：内置实现恒通过——findings 空数组）。
 * M3 不做真实安全规则（security_audit 表不随 M3 落库——08 §9「随对应服务引入」；
 * 直通无 findings 可落，不为空转机制造表）。
 */
import type { ScanInput, ScanResult, Scanner } from './types.js';

export function createPassThroughScanner(): Scanner {
  return {
    async scan(_input: ScanInput): Promise<ScanResult> {
      // 直通：内容零检查，findings 空——真规则（M6 安全扩展）在此替换
      return { ok: true, findings: [] };
    },
  };
}
