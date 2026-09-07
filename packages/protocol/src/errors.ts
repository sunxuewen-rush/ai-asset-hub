/**
 * 资产协议校验错误码（族协议表合并去重：02 §4 + 03 §4 + 04 §5）。
 * 结构化 code 返回（07 §4：前端按 code 映射 i18n）。
 */
export const protocolErrorCodes = {
  /** skill frontmatter 缺失/非法（02 §4） */
  invalidSkillFrontmatter: 'invalid_skill_frontmatter',
  /** agent frontmatter 缺失/非法（04 §5） */
  invalidAgentFrontmatter: 'invalid_agent_frontmatter',
  missingName: 'missing_name',
  invalidName: 'invalid_name',
  missingDescription: 'missing_description',
  missingBody: 'missing_body',
  unsupportedFileType: 'unsupported_file_type',
  fileTooLarge: 'file_too_large',
  tooManyFiles: 'too_many_files',
  packageTooLarge: 'package_too_large',
  /** mcp 敏感头明文未用 ${VAR} 引用（03 §4） */
  sensitiveHeaderPlaintext: 'sensitive_header_plaintext',
} as const;

export type ProtocolErrorCode = (typeof protocolErrorCodes)[keyof typeof protocolErrorCodes];
