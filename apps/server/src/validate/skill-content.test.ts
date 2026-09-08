import { describe, expect, it } from 'bun:test';
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { buildZip } from '../test-utils/zip-builder.js';
import { createSkillValidator } from './skill.js';
import { parseFrontmatter } from './frontmatter.js';

const validator = createSkillValidator();
const VALID = '---\nname: hello\ndescription: A demo skill\n---\n# Hello\n\nBody content.\n';

async function validateSkillMd(skillMd: string) {
  return validator.validate(buildZip([{ name: 'SKILL.md', content: skillMd }]));
}

describe('skill frontmatter 内容契约（02 §3.1/§3.3）', () => {
  it('合法 frontmatter + 非空正文 → ok', async () => {
    const r = await validateSkillMd(VALID);
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it('未知字段 passthrough（OpenSkills 生态字段不报错）', async () => {
    const r = await validateSkillMd(
      '---\nname: hello\ndescription: hi\nallowedTools: [bash]\nmetadata: {tags: [x]}\n---\nbody\n',
    );
    expect(r.ok).toBe(true);
  });

  it('缺 frontmatter（不以 --- 开头）→ invalid_skill_frontmatter', async () => {
    const r = await validateSkillMd('# Hello\n\nNo frontmatter here.\n');
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.invalidSkillFrontmatter);
  });

  it('frontmatter 段未闭合 → invalid_skill_frontmatter', async () => {
    const r = await validateSkillMd('---\nname: hello\ndescription: hi\n');
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.invalidSkillFrontmatter);
  });

  it('YAML 语法坏 → invalid_skill_frontmatter', async () => {
    const r = await validateSkillMd('---\nname: [unclosed\ndescription: hi\n---\nbody\n');
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.invalidSkillFrontmatter);
  });

  it('name 缺失 → missing_name', async () => {
    const r = await validateSkillMd('---\ndescription: hi\n---\nbody\n');
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.missingName);
  });

  it('name 非法（大写）→ invalid_name', async () => {
    const r = await validateSkillMd('---\nname: MySkill\ndescription: hi\n---\nbody\n');
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.invalidName);
  });

  it('description 缺失 → missing_description', async () => {
    const r = await validateSkillMd('---\nname: hello\n---\nbody\n');
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.missingDescription);
  });

  it('description 超 1024 → description_too_long', async () => {
    const r = await validateSkillMd(`---\nname: hello\ndescription: ${'x'.repeat(1025)}\n---\nbody\n`);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.descriptionTooLong);
  });

  it('正文空 → missing_body（02 §3.3 body 规则）', async () => {
    const r = await validateSkillMd('---\nname: hello\ndescription: hi\n---\n\n  \n');
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.missingBody);
  });

  it('多内容违规累积（缺 name + body 空）', async () => {
    const r = await validateSkillMd('---\ndescription: hi\n---\n');
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain(protocolErrorCodes.missingName);
    expect(codes).toContain(protocolErrorCodes.missingBody);
  });

  it('主文件变体也走内容校验（skill.md 坏 frontmatter → 拒）', async () => {
    const r = await validator.validate(
      buildZip([{ name: 'skill.md', content: '# no frontmatter\n' }]),
    );
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.invalidSkillFrontmatter);
  });
});

describe('parseFrontmatter（提取段工具）', () => {
  it('标准三段式', () => {
    const r = parseFrontmatter('---\nname: a\ndescription: b\n---\n# Body\n');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.data.name).toBe('a');
      expect(r.value.body).toBe('# Body\n');
    }
  });

  it('CRLF 兼容', () => {
    const r = parseFrontmatter('---\r\nname: a\r\ndescription: b\r\n---\r\nbody\r\n');
    expect(r.ok).toBe(true);
  });

  it('非对象 YAML（纯标量）→ invalid_yaml', () => {
    const r = parseFrontmatter('---\njust a string\n---\nbody\n');
    expect(r.ok).toBe(false);
  });

  it('危险标签 !!js/function 不可解析（CORE_SCHEMA 安全面）', () => {
    const r = parseFrontmatter('---\nname: a\npayload: !!js/function "return 1"\n---\nbody\n');
    expect(r.ok).toBe(false);
  });

  it('缺关闭段 → invalid_yaml', () => {
    const r = parseFrontmatter('---\nname: a\ndescription: b\n');
    expect(r.ok).toBe(false);
  });

  it('BOM 前缀容错（T10：首行 BOM + --- 可解析——trim 含 \\uFEFF）', () => {
    const r = parseFrontmatter('\uFEFF---\nname: a\ndescription: b\n---\nbody\n');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.data.name).toBe('a');
  });

  it('__proto__ 注入载荷安全（不产出继承键——原型污染防护实证）', () => {
    const r = parseFrontmatter('---\nname: a\n__proto__: {polluted: true}\nconstructor: {prototype: {x: 1}}\n---\nbody\n');
    expect(r.ok).toBe(true);
    if (r.ok) {
      const { data } = r.value;
      // js-yaml 5 实证：__proto__/constructor 作普通自有键（defineProperty 安全赋值）
      // 关键断言 = 原型链零污染：
      expect((data as { polluted?: unknown }).polluted).toBeUndefined(); // data 自身原型未被换
      const dataProto = Object.getPrototypeOf(data) as { polluted?: unknown; x?: unknown };
      expect(dataProto.polluted).toBeUndefined();
      const plain: Record<string, unknown> = { key: 'v' };
      expect((plain as { polluted?: unknown }).polluted).toBeUndefined(); // 全局原型未污染
      expect(Object.getPrototypeOf(plain)).not.toHaveProperty('x');
    }
  });
});
