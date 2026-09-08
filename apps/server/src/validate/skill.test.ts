import { describe, expect, it } from 'bun:test';
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { buildZip } from '../test-utils/zip-builder.js';
import { extensionOf } from './base.js';
import { createSkillValidator } from './skill.js';
import { ensureTestEnv } from '../test-utils/env-setup.js';
ensureTestEnv();

const validator = createSkillValidator();
const base = '---\nname: hello\ndescription: hi\n---\n# Hello\n';

describe('skill 族细则（02 §2/§3.3）', () => {
  it('合法包：SKILL.md + references 子目录 → ok', async () => {
    const zip = buildZip([
      { name: 'SKILL.md', content: base },
      { name: 'references/a.md', content: 'a\n' },
      { name: 'scripts/run.sh', content: '#!/bin/sh\n' },
      { name: 'assets/icon.png', content: Buffer.from([1, 2, 3]) },
    ]);
    const r = await validator.validate(zip);
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it('主文件大小写变体兼容（02 §2：skill.md/Skill.md）', async () => {
    for (const variant of ['skill.md', 'Skill.md']) {
      const r = await validator.validate(buildZip([{ name: variant, content: base }]));
      expect(r.ok).toBe(true);
    }
  });

  it('主文件非 root 级（子目录）→ package_layout_invalid', async () => {
    const r = await validator.validate(buildZip([{ name: 'sub/SKILL.md', content: base }]));
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(assetErrorCodes.packageLayoutInvalid);
  });

  it('双主文件并存：规范名 SKILL.md 胜出（zip 序无关）', async () => {
    const r = await validator.validate(
      buildZip([
        { name: 'skill.md', content: base },
        { name: 'SKILL.md', content: base },
      ]),
    );
    expect(r.ok).toBe(true);
  });

  it('白名单外扩展名 → unsupported_file_type（path 标注）', async () => {
    const r = await validator.validate(
      buildZip([
        { name: 'SKILL.md', content: base },
        { name: 'tools/helper.exe', content: 'MZ' },
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
    expect(r.errors[0]?.path).toBe('tools/helper.exe');
  });

  it('无扩展名文件（scripts/run）→ unsupported_file_type', async () => {
    const r = await validator.validate(
      buildZip([
        { name: 'SKILL.md', content: base },
        { name: 'scripts/run', content: 'echo hi\n' },
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
  });

  it('点文件 .env → unsupported_file_type（凭据泄露防护）', async () => {
    const r = await validator.validate(
      buildZip([
        { name: 'SKILL.md', content: base },
        { name: '.env', content: 'SECRET=1\n' },
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.path).toBe('.env');
  });

  it('扩展名大小写宽容（A.PNG → 接受，匹配表小写）', async () => {
    const r = await validator.validate(
      buildZip([
        { name: 'SKILL.md', content: base },
        { name: 'assets/A.PNG', content: Buffer.from([1]) },
      ]),
    );
    expect(r.ok).toBe(true);
  });

  it('多违规累积上报（issues 全量，T12 上传端展示）', async () => {
    const r = await validator.validate(
      buildZip([
        { name: 'SKILL.md', content: base },
        { name: 'a.exe', content: 'x' },
        { name: 'b.dll', content: 'y' },
      ]),
    );
    expect(r.errors).toHaveLength(2);
  });
});

describe('extensionOf', () => {
  it('普通/点文件/无扩展/多级路径', () => {
    expect(extensionOf('a.md')).toBe('.md');
    expect(extensionOf('assets/icon.PNG')).toBe('.png');
    expect(extensionOf('.env')).toBe('');
    expect(extensionOf('scripts/run')).toBe('');
    expect(extensionOf('a.tar.gz')).toBe('.gz');
  });
});
