/**
 * 治理扫描器 SPI（M3 design §3.2 R3；01 §5「安全扫描扩展点」落地）。
 * 扫描位置：提交审核（submit）动作内同步执行（design §3.1——M3 直通实现恒通过，
 * SCANNING 为瞬态不落库）；契约纯 error/finding 数组，无 warning 级（design §3.2——
 * M2 v1.2 砍 warnings 先例同精神）。
 * 未来真扫描器（M6 安全扩展）引入时按 type 差异化规则（mcp 含代码/配置比纯文本
 * skill/agent 从严——01 §5），届时 SCANNING/SCAN_FAILED 为外部可见态（读面/错误码已备）。
 */
import type { AssetType } from '../db/schema/index.js';

/** 扫描发现（可扩展：severity 分级等随真规则引入，M3 不为空转机制造字段） */
export interface ScanFinding {
  /** 结构化码（protocolErrorCodes / 扫描器自定——真规则引入时定） */
  code: string;
  /** 命中条目路径（非文件级发现缺省） */
  path?: string;
  message?: string;
}

export interface ScanResult {
  ok: boolean;
  findings: ScanFinding[];
}

export interface ScanInput {
  type: AssetType;
  /** 族协议 manifest 规范化结果（上传投影落库的 manifest_json——内容面扫描依据） */
  manifestJson: Record<string, unknown> | null;
  /** 包文件清单（路径/大小——真扫描器按需扩展内容访问，M6 议） */
  files: Array<{ path: string; size: number }>;
}

/** 治理扫描器：提交审核时对包内容做安全/合规扫描（M3 直通；M6 真规则） */
export interface Scanner {
  scan(input: ScanInput): Promise<ScanResult>;
}
