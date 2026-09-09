import { describe, expect, it } from 'bun:test';
import type { McpManifest } from '@ai-asset-hub/protocol';
import {
  BODY_SUMMARY_CHARS,
  projectAgent,
  projectAsset,
  projectMcp,
  projectSkill,
} from './projection.js';

const skillManifest = {
  name: 'hello',
  description: 'A demo skill',
  allowedTools: ['bash'],
  metadata: { tags: ['x'] },
};
const agentManifest = {
  name: 'cr',
  description: '评审专家',
  category: 'engineering',
  icon: 'ShieldCheck',
};
const mcpManifest: McpManifest = {
  name: 'demo',
  description: 'demo mcp',
  servers: {
    s: {
      type: 'http',
      url: 'https://example.com',
      enabled: true,
      headers: { Authorization: '$' + '{TOKEN}' },
    },
  },
  tools: ['list'],
};

describe('projectSkill（02 §3.1 + 01 §3.2）', () => {
  it('manifest_json 保留未知字段（passthrough——02 §3.1 完整持久化）', () => {
    const p = projectSkill(skillManifest, '# Body\n');
    expect(p.manifestJson.allowedTools).toEqual(['bash']);
    expect(p.manifestJson.metadata).toEqual({ tags: ['x'] });
  });

  it('searchText = name + description + 正文摘要（空白归一；markdown 原样保留）', () => {
    const p = projectSkill(skillManifest, '# Hello\n\nThis is   the   body.\n');
    expect(p.parsedMetadata.searchText).toBe('hello A demo skill # Hello This is the body.');
    expect(p.parsedMetadata.summary).toBeUndefined(); // skill 无 summary 扩展
  });

  it('正文摘要截断 500（D1）', () => {
    const longBody = `# x\n\n${'word '.repeat(600)}`;
    const p = projectSkill({ ...skillManifest }, longBody);
    expect(p.parsedMetadata.searchText.length).toBeLessThanOrEqual(2000);
    expect(p.parsedMetadata.searchText).toContain('word word');
  });

  it('body 空 → searchText 不含摘要段', () => {
    const p = projectSkill({ ...skillManifest }, '');
    expect(p.parsedMetadata.searchText).toBe('hello A demo skill');
  });
});

describe('projectAgent（04 §7 summary）', () => {
  it('summary = category/icon/color 有值键', () => {
    const p = projectAgent(agentManifest, 'body\n');
    expect(p.parsedMetadata.summary).toEqual({ category: 'engineering', icon: 'ShieldCheck' });
  });

  it('无可选字段 → summary 键省略', () => {
    const p = projectAgent({ name: 'a', description: 'b' }, 'body\n');
    expect(p.parsedMetadata.summary).toBeUndefined();
  });
});

describe('projectMcp（03 §7 连接形态）', () => {
  it('http → 远程 · url', () => {
    const p = projectMcp(mcpManifest);
    expect(p.parsedMetadata.summary).toBe('远程 · https://example.com');
    expect(p.parsedMetadata.searchText).toBe('demo demo mcp'); // mcp 无正文
  });

  it('sse → sse · url', () => {
    const p = projectMcp({
      ...mcpManifest,
      servers: { s: { type: 'sse', url: 'https://e.com/sse', enabled: true } },
    });
    expect(p.parsedMetadata.summary).toBe('sse · https://e.com/sse');
  });

  it('stdio → 本地 · command args', () => {
    const p = projectMcp({
      ...mcpManifest,
      servers: {
        s: { type: 'stdio', command: 'node', args: ['scripts/server.js'], enabled: true },
      },
    });
    expect(p.parsedMetadata.summary).toBe('本地 · node scripts/server.js');
  });

  it('manifest_json 含 passthrough 字段（tools 等 03 §7）', () => {
    const p = projectMcp(mcpManifest);
    expect(p.manifestJson.tools).toEqual(['list']);
    expect(p.parsedMetadata.summary).toBe('远程 · https://example.com');
  });
});

describe('projectAsset 分发', () => {
  it('三族 dispatch 正确（含 body 仅文本族）', () => {
    expect(projectAsset('skill', skillManifest, 'body\n').parsedMetadata.type).toBe('skill');
    expect(projectAsset('agent', agentManifest, 'body\n').parsedMetadata.type).toBe('agent');
    expect(projectAsset('mcp', mcpManifest).parsedMetadata.type).toBe('mcp');
  });
});

describe('BODY_SUMMARY_CHARS 常量（D1 契约锚）', () => {
  it('截断数值 = 500（02/03/04 规范同步项补注对象）', () => {
    expect(BODY_SUMMARY_CHARS).toBe(500);
  });
});
