import { describe, expect, it } from 'bun:test';
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { buildZip } from '../test-utils/zip-builder.js';
import { createAgentValidator } from './agent.js';
import { ensureTestEnv } from '../test-utils/env-setup.js';
ensureTestEnv();

const validator = createAgentValidator();

function agentZip(agentMd: string, extra: Array<{ name: string; content: string | Buffer }> = []) {
  return buildZip([{ name: 'agent.md', content: agentMd }, ...extra]);
}

const VALID = '---\nname: code-reviewer\ndescription: 资深代码评审专家\nlabel: 代码评审官\n---\n# 身份\n\n评审代码。\n';

describe('agent 族规则（04 §2/§3/§4/§5）', () => {
  it('合法包（agent.md + README.md + assets 资源）→ ok', async () => {
    const r = await validator.validate(
      agentZip(VALID, [
        { name: 'README.md', content: '# use\n' },
        { name: 'assets/icon.svg', content: '<svg/>' },
        { name: 'assets/banner.webp', content: Buffer.from([1]) },
      ]),
    );
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it('可选字段 label/icon/category 通过（04 §3.1）', async () => {
    const r = await validator.validate(
      agentZip('---\nname: cr\ndescription: x\nicon: ShieldCheck\ncategory: engineering\n---\nbody\n'),
    );
    expect(r.ok).toBe(true);
  });

  it('缺 frontmatter → invalid_agent_frontmatter', async () => {
    const r = await validator.validate(agentZip('# no frontmatter\n'));
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.invalidAgentFrontmatter);
  });

  it('缺 name → missing_name', async () => {
    const r = await validator.validate(agentZip('---\ndescription: x\n---\nbody\n'));
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.missingName);
  });

  it('正文空 → missing_body（04 §3.2）', async () => {
    const r = await validator.validate(agentZip('---\nname: a\ndescription: b\n---\n'));
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.missingBody);
  });

  it('root 杂散（非 agent.md/README.md）→ unsupported_file_type', async () => {
    const r = await validator.validate(agentZip(VALID, [{ name: 'notes.md', content: 'x' }]));
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
    expect(r.errors[0]?.path).toBe('notes.md');
  });

  it('scripts/ 目录 → 拒（04 结构无 scripts——assets 白名单外）', async () => {
    const r = await validator.validate(agentZip(VALID, [{ name: 'scripts/run.js', content: 'x' }]));
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
  });

  it('assets/ 内白名单外扩展名（.js）→ 拒（04 §4 表无 .js）', async () => {
    const r = await validator.validate(agentZip(VALID, [{ name: 'assets/bundle.js', content: 'x' }]));
    expect(r.ok).toBe(false);
  });
});
