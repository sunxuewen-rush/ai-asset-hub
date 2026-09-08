/**
 * 元数据投影（M2 T11；01 §3.2 契约）：
 * - manifest_json = 校验后族协议 manifest（技能/agent frontmatter、mcp servers 快照——
 *   02 §3.1「完整解析结果持久化」；zod passthrough 保留未知扩展字段）
 * - parsed_metadata_json = {name, description, searchText, type, summary?}（检索/展示元数据）
 * 输入约定：调用方（T12 上传管线）传入**已通过族校验**的 manifest + 正文文本。
 */
import type { AgentManifest, McpManifest, SkillManifest } from '@ai-asset-hub/protocol';
import type { AssetType } from '../db/schema/index.js';

/** 01 §3.2 投影：parsed_metadata_json 结构 */
export interface ParsedMetadata {
  name: string;
  description: string;
  searchText: string;
  type: AssetType;
  /** 族可选展示性摘要（02 无 / 03 连接形态字符串 / 04 category-icon-color 对象） */
  summary?: string | Record<string, unknown>;
}

export interface AssetProjection {
  /** 族协议 manifest 序列化快照（校验后对象——zod 已归一化键名） */
  manifestJson: Record<string, unknown>;
  parsedMetadata: ParsedMetadata;
}

/**
 * D1 决策：正文摘要截断字符数（01 §3.2「各族定义截断规则」——族文档无数值，
 * 本实现定 500 并入 searchText；规范同步项补注 02/03/04 收尾）。
 */
export const BODY_SUMMARY_CHARS = 500;

/** 正文摘要：去前导/连续空白后截断（检索文本——换行压空格） */
function bodySummaryOf(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, BODY_SUMMARY_CHARS);
}

/** searchText = name + description + 正文摘要（01 §3.2；组合后空白归一 + 总长保险界） */
function buildSearchText(name: string, description: string, bodySummary?: string): string {
  const parts = [name, description];
  if (bodySummary) parts.push(bodySummary);
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
}

export function projectSkill(manifest: SkillManifest, body: string): AssetProjection {
  const parsed: ParsedMetadata = {
    name: manifest.name,
    description: manifest.description,
    searchText: buildSearchText(manifest.name, manifest.description, bodySummaryOf(body)),
    type: 'skill',
  };
  return { manifestJson: manifest as unknown as Record<string, unknown>, parsedMetadata: parsed };
}

/** 04 §7：summary = category/icon/color 落平台元数据（只含有值键） */
function agentSummaryOf(manifest: AgentManifest): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const key of ['category', 'icon', 'color'] as const) {
    const value = manifest[key];
    if (value !== undefined) summary[key] = value;
  }
  return summary;
}

export function projectAgent(manifest: AgentManifest, body: string): AssetProjection {
  const summary = agentSummaryOf(manifest);
  const parsed: ParsedMetadata = {
    name: manifest.name,
    description: manifest.description,
    searchText: buildSearchText(manifest.name, manifest.description, bodySummaryOf(body)),
    type: 'agent',
    ...(Object.keys(summary).length > 0 ? { summary } : {}),
  };
  return { manifestJson: manifest as unknown as Record<string, unknown>, parsedMetadata: parsed };
}

/** 03 §7：summary = 连接形态展示串（首 server——多 server 展示主形态） */
function mcpSummaryOf(manifest: McpManifest): string | undefined {
  const first = Object.values(manifest.servers)[0];
  if (!first) return undefined;
  if (first.type === 'http') return `远程 · ${first.url}`;
  if (first.type === 'sse') return `sse · ${first.url}`;
  const args = first.args && first.args.length > 0 ? ` ${first.args.join(' ')}` : '';
  return `本地 · ${first.command ?? ''}${args}`;
}

export function projectMcp(manifest: McpManifest): AssetProjection {
  const summary = mcpSummaryOf(manifest);
  const parsed: ParsedMetadata = {
    name: manifest.name,
    description: manifest.description,
    searchText: buildSearchText(manifest.name, manifest.description),
    type: 'mcp',
    ...(summary !== undefined ? { summary } : {}),
  };
  return { manifestJson: manifest as unknown as Record<string, unknown>, parsedMetadata: parsed };
}

/** 族分发入口（T12 上传管线按资产 type 调用；body 仅文本族需要） */
export function projectAsset(type: AssetType, manifest: unknown, body?: string): AssetProjection {
  switch (type) {
    case 'skill':
      return projectSkill(manifest as SkillManifest, body ?? '');
    case 'mcp':
      return projectMcp(manifest as McpManifest);
    case 'agent':
      return projectAgent(manifest as AgentManifest, body ?? '');
  }
}
