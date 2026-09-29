import { describe, expect, it } from 'bun:test';
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { ensureTestEnv } from '../test-utils/env-setup.js';
import { buildZip } from '../test-utils/zip-builder.js';
import { extensionOf } from './base.js';
import { createSkillValidator } from './skill.js';

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

  // **契约翻转（F242 · 用户 2026-09-28 拍板 B）**：原「root 级主文件」契约放宽为
  // 「唯一顶层目录 ⇒ 剥一层后再判定」（`docs/02` §2 已同步）——故此例从**拒绝**改为**接受**
  it('主文件在子目录且为唯一顶层目录 ⇒ 剥层后接受（F242 契约翻转）', async () => {
    const r = await validator.validate(buildZip([{ name: 'sub/SKILL.md', content: base }]));
    expect(r.ok).toBe(true);
  });

  it('主文件在**两层**子目录 ⇒ 仍拒（F242 边界：只剥一层）', async () => {
    const r = await validator.validate(buildZip([{ name: 'a/b/SKILL.md', content: base }]));
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
