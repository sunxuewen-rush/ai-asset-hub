import { describe, expect, it } from 'bun:test';
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { ensureTestEnv } from '../test-utils/env-setup.js';
import { buildSkillZip, buildZip } from '../test-utils/zip-builder.js';
import { createValidatorRegistry } from './registry.js';

ensureTestEnv();

/**
 * registry 级端到端（T9）：三族合法包全过 + 各族反例在统一分发下正确拒绝。
 * 错误码契约：协议码（02/03/04 §4/§5 表）与 asset 域安全码统一，无手写字符串。
 */
const registry = createValidatorRegistry();

const MCP_VALID = JSON.stringify({
  name: 'demo',
  description: 'demo mcp',
  servers: { s: { type: 'http', url: 'https://example.com', enabled: true } },
});

const AGENT_VALID = '---\nname: cr\ndescription: 评审专家\n---\n# 身份\n\n评审。\n';

function mcpZip(manifest: string, extra: Array<{ name: string; content: string | Buffer }> = []) {
  return buildZip([{ name: 'mcp.json', content: manifest }, ...extra]);
}

describe('registry 三族分发（端到端）', () => {
  it('三族合法包全过', async () => {
    expect((await registry.skill.validate(buildSkillZip())).ok).toBe(true);
    expect((await registry.mcp.validate(mcpZip(MCP_VALID))).ok).toBe(true);
    expect(
      (await registry.agent.validate(buildZip([{ name: 'agent.md', content: AGENT_VALID }]))).ok,
    ).toBe(true);
  });

  it('错误资产传给错误族校验器 → 结构拒绝（族契约隔离）', async () => {
    // mcp 包传给 skill 校验器：SKILL.md 不存在 → layout 错
    const r = await registry.skill.validate(mcpZip(MCP_VALID));
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(assetErrorCodes.packageLayoutInvalid);
  });

  it('skill 反例：白名单外扩展名', async () => {
    const zip = buildZip([
      { name: 'SKILL.md', content: '---\nname: a\ndescription: b\n---\nbody\n' },
      { name: 'evil.exe', content: 'MZ' },
    ]);
    const r = await registry.skill.validate(zip);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
  });

  it('skill 反例：frontmatter name 非法', async () => {
    const r = await registry.skill.validate(
      buildZip([{ name: 'SKILL.md', content: '---\nname: Bad_Name\ndescription: b\n---\nbody\n' }]),
    );
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.invalidName);
  });

  it('mcp 反例：缺主文件', async () => {
    const r = await registry.mcp.validate(buildZip([{ name: 'README.md', content: 'x' }]));
    expect(r.errors[0]?.code).toBe(assetErrorCodes.packageLayoutInvalid);
  });

  it('mcp 反例：敏感头明文', async () => {
    const r = await registry.mcp.validate(
      mcpZip(
        JSON.stringify({
          name: 'demo',
          description: 'x',
          servers: {
            s: {
              type: 'http',
              url: 'https://e.com',
              enabled: true,
              headers: { 'x-api-key': 'sk-123' },
            },
          },
        }),
      ),
    );
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.sensitiveHeaderPlaintext);
  });

  it('mcp 反例：依赖目录 node_modules', async () => {
    const r = await registry.mcp.validate(
      mcpZip(MCP_VALID, [{ name: 'node_modules/x/index.js', content: 'x' }]),
    );
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
  });

  it('agent 反例：缺 frontmatter', async () => {
    const r = await registry.agent.validate(buildZip([{ name: 'agent.md', content: '# plain\n' }]));
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.invalidAgentFrontmatter);
  });

  it('agent 反例：root 杂散文件', async () => {
    const r = await registry.agent.validate(
      buildZip([
        { name: 'agent.md', content: AGENT_VALID },
        { name: 'extra.yaml', content: 'x: 1\n' },
      ]),
    );
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
  });
});
