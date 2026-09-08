/**
 * 上传组合入口（M2 T12；plan「zip 校验 + 族校验 + 主文件提取 + 解析」）。
 * 流程：族 validator（registry[type]——结构/布局/内容契约全链路）→ 通过后提取
 * 解析结果（main manifest 对象 + 文本族 body）——T12 投影输入。
 * 解析失败理论不可达（validator 已过同源 schema）——防御性 rethrow（真 bug 信号 500）。
 */
import { AgentManifestSchema, McpManifestSchema, SkillManifestSchema } from '@ai-asset-hub/protocol';
import type { AssetType } from '../db/schema/index.js';
import { parseFrontmatter } from './frontmatter.js';
import { AGENT_MAIN_FILE, createAgentValidator } from './agent.js';
import { MCP_MAIN_FILE, createMcpValidator } from './mcp.js';
import { createSkillValidator, findSkillMainEntry } from './skill.js';
import type { ValidationIssue } from './types.js';
import { readZipEntry, scanZip, type ZipEntryMeta } from './zip.js';

export interface ValidatedPackage {
  type: AssetType;
  entries: ZipEntryMeta[];
  /** 族协议 manifest 对象（已过 zod——投影 manifest_json 源） */
  manifest: Record<string, unknown>;
  /** 文本族正文（skill/agent——searchText 摘要源；mcp 无） */
  body?: string;
}

export type PackageValidationResult =
  | { ok: true; validated: ValidatedPackage }
  | { ok: false; errors: ValidationIssue[] };

const validators = {
  skill: createSkillValidator(),
  mcp: createMcpValidator(),
  agent: createAgentValidator(),
};

/** 主文件解析（族专用：frontmatter 族走 YAML + zod；mcp 走 JSON + zod） */
async function parseMainFile(type: AssetType, zip: Buffer, entries: ZipEntryMeta[]): Promise<{ manifest: unknown; body?: string }> {
  const read = (path: string) => readZipEntry(zip, path);
  if (type === 'skill') {
    const main = findSkillMainEntry(entries);
    const content = (await read(main!.path)).toString('utf8');
    const parsed = parseFrontmatter(content);
    if (!parsed.ok) throw new Error(`unreachable: skill main file parse failed after validation (${parsed.error})`);
    const schemaResult = SkillManifestSchema.safeParse(parsed.value.data);
    if (!schemaResult.success) throw new Error('unreachable: skill manifest schema failed after validation');
    return { manifest: schemaResult.data, body: parsed.value.body };
  }
  if (type === 'agent') {
    const content = (await read(AGENT_MAIN_FILE)).toString('utf8');
    const parsed = parseFrontmatter(content);
    if (!parsed.ok) throw new Error(`unreachable: agent main file parse failed after validation (${parsed.error})`);
    const schemaResult = AgentManifestSchema.safeParse(parsed.value.data);
    if (!schemaResult.success) throw new Error('unreachable: agent manifest schema failed after validation');
    return { manifest: schemaResult.data, body: parsed.value.body };
  }
  const content = (await read(MCP_MAIN_FILE)).toString('utf8');
  const json: unknown = JSON.parse(content);
  const schemaResult = McpManifestSchema.safeParse(json);
  if (!schemaResult.success) throw new Error('unreachable: mcp manifest schema failed after validation');
  return { manifest: schemaResult.data };
}

/** 上传管线组合校验（T12 createVersion 第一步消费；T13 前不重复造轮） */
export async function validatePackage(type: AssetType, file: Buffer): Promise<PackageValidationResult> {
  const validator = validators[type];
  const result = await validator.validate(file);
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    const { entries } = await scanZip(file);
    const { manifest, body } = await parseMainFile(type, file, entries);
    return {
      ok: true,
      validated: { type, entries, manifest: manifest as Record<string, unknown>, body },
    };
  } catch {
    // 校验器通过后解析失败 = 服务端不一致 bug——透出 500（不吞）
    throw new Error(`validatePackage: parse main file failed after validation passed (type=${type})`);
  }
}
