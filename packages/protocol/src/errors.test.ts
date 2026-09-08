import { describe, expect, it } from 'bun:test';
import { protocolErrorCodes } from './errors.js';

// 错误码表单源纪律（07 §4：前端按 code 映射 i18n；schema message 与表脱节 = 缺陷）：
// 值唯一 + code 风格 + 关键码存在性，防补码时打散/拼错。
describe('protocolErrorCodes', () => {
  it('values are unique (one code per key, no collisions)', () => {
    const values = Object.values(protocolErrorCodes);
    expect(new Set(values).size).toBe(values.length);
  });

  it('all values follow snake_case code style', () => {
    for (const code of Object.values(protocolErrorCodes)) {
      expect(code).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('covers 族协议错误码（02 §4 / 03 §4 / 04 §5）与 schema 实现码', () => {
    const values = Object.values(protocolErrorCodes) as readonly string[];
    const required = [
      // 02 §4 / 04 §5 公共
      'invalid_skill_frontmatter',
      'invalid_agent_frontmatter',
      'missing_name',
      'invalid_name',
      'missing_description',
      'missing_body',
      'unsupported_file_type',
      'file_too_large',
      'too_many_files',
      'package_too_large',
      // 03 §4 敏感头
      'sensitive_header_plaintext',
      // 实现码（slug/schema message，无族协议表）
      'description_too_long',
      'enabled_required',
      'stdio_requires_command',
      'url_required',
      'url_must_be_http',
      'conflicting_url_with_stdio',
      'conflicting_command_with_url',
      'command_backslash',
      'servers_empty',
    ];
    const missing = required.filter((code) => !values.includes(code));
    expect(missing).toEqual([]);
  });
});
