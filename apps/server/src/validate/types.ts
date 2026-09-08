/**
 * 族协议校验器 SPI（M2 design §4；01 §5 AssetValidator 接口落地）。
 * 校验流程：zip 结构校验（scanZip——安全/超限，validate/zip.ts）→ 族内容校验
 * （skill/mcp/agent 各族规则，T6-T8）。错误码：结构/超限用 protocol 协议码
 * （02 §3.3/§4：file_too_large 等）+ asset 域安全码（package_path_invalid——
 * 路径穿越/symlink）；族内容码（frontmatter/manifest）各族规则内引用 protocol 码。
 */
import type { AssetType } from '../db/schema/index.js';

export interface ValidationIssue {
  /** 07 §4 结构化错误码（protocolErrorCodes / assetErrorCodes） */
  code: string;
  /** 违规条目路径（zip 内相对路径；非文件级错误缺省） */
  path?: string;
  message?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
}

/** 族校验器：zip 结构 + 族内容一体化校验（T12 上传端消费） */
export interface AssetValidator {
  readonly type: AssetType;
  validate(zip: Buffer): Promise<ValidationResult>;
}
