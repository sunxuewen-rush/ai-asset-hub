/**
 * frontmatter 解析（族协议主文件共用：skill SKILL.md / agent agent.md 的 YAML 头段）。
 * 规则（02 §3：以 `---` 行开头的 YAML frontmatter；关闭 `---` 行后为 markdown 正文）。
 * YAML 解析用 CORE_SCHEMA（YAML 1.2 core——无 !!js/!!python 危险标签，禁原型污染面）；
 * js-yaml 内置 alias 防护。解析器不校验字段（zod schema 层做——
 * SkillManifestSchema/AgentManifestSchema）；本文件只负责「提取段 + 安全解析为对象」。
 */
import * as yaml from 'js-yaml';

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  /** frontmatter 之后的正文（trim 后判断非空——02 §3.3 body 规则） */
  body: string;
}

export type FrontmatterError = 'missing_frontmatter' | 'invalid_yaml';

export type FrontmatterResult =
  | { ok: true; value: ParsedFrontmatter }
  | { ok: false; error: FrontmatterError };

/**
 * 行式解析：首行须为 `---`；随后行到关闭 `---` 行为 YAML 段；其后为正文。
 * CRLF/尾随空格兼容（行 trim 判定）。主文件内容上限已由 scanZip ≤1MiB 保证。
 */
export function parseFrontmatter(content: string): FrontmatterResult {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || lines[0]!.trim() !== '---') {
    return { ok: false, error: 'missing_frontmatter' };
  }

  const yamlLines: string[] = [];
  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === '---') {
      closeIndex = i;
      break;
    }
    yamlLines.push(lines[i]!);
  }
  if (closeIndex < 0) return { ok: false, error: 'invalid_yaml' };

  const yamlText = yamlLines.join('\n');
  const body = lines.slice(closeIndex + 1).join('\n');

  try {
    const data = yaml.load(yamlText, { schema: yaml.CORE_SCHEMA });
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return { ok: false, error: 'invalid_yaml' };
    }
    return { ok: true, value: { data: data as Record<string, unknown>, body } };
  } catch {
    return { ok: false, error: 'invalid_yaml' };
  }
}
