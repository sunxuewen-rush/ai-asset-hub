/**
 * 资产协议校验错误码（族协议表合并去重：02 §4 + 03 §4 + 04 §5；schema 校验 message
 * code 集中单源——mcp 族 code 由实现定义并在此收录，03 §3.3/§5 无独立错误码表）。
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
  /** description 超长（02/03/04 §3.x：≤1024；族协议错误码表未列，实现码） */
  descriptionTooLong: 'description_too_long',
  missingBody: 'missing_body',
  unsupportedFileType: 'unsupported_file_type',
  fileTooLarge: 'file_too_large',
  tooManyFiles: 'too_many_files',
  packageTooLarge: 'package_too_large',
  /** mcp 敏感头明文未用 ${VAR} 引用（03 §4） */
  sensitiveHeaderPlaintext: 'sensitive_header_plaintext',
  /** mcp server 条目（03 §3.2/§3.3：type 必填与字段互斥） */
  enabledRequired: 'enabled_required',
  stdioRequiresCommand: 'stdio_requires_command',
  urlRequired: 'url_required',
  urlMustBeHttp: 'url_must_be_http',
  conflictingUrlWithStdio: 'conflicting_url_with_stdio',
  conflictingCommandWithUrl: 'conflicting_command_with_url',
  commandBackslash: 'command_backslash',
  serversEmpty: 'servers_empty',
} as const;

export type ProtocolErrorCode = (typeof protocolErrorCodes)[keyof typeof protocolErrorCodes];
