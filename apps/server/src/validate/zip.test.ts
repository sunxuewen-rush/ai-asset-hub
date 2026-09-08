import { describe, expect, it } from 'bun:test';
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { buildSkillZip, buildZip } from '../test-utils/zip-builder.js';
import { createValidatorRegistry } from './registry.js';
import { readZipEntry, scanZip, ZipValidationError, type ZipLimits } from './zip.js';

const SMALL_LIMITS: ZipLimits = {
  maxTotalBytes: 10,
  maxFileBytes: 5,
  maxFiles: 2,
};

async function expectZipCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error('expected ZipValidationError');
  } catch (err) {
    if (err instanceof Error && err.message === 'expected ZipValidationError') throw err;
    expect(err).toBeInstanceOf(ZipValidationError);
    expect((err as ZipValidationError).code).toBe(code);
  }
}

describe('scanZip 结构校验（design §4 / 02 §3.3）', () => {
  it('合法包返回条目（目录条目跳过）', async () => {
    const zip = buildZip([
      { name: 'SKILL.md', content: '# hi\n', mode: 0o100644 },
      { name: 'refs/', content: '', mode: 0o040755 },
      { name: 'refs/a.md', content: 'a\n' },
    ]);
    const { entries } = await scanZip(zip);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.path)).toEqual(['SKILL.md', 'refs/a.md']);
  });

  it('路径穿越 ../ → 拒绝（yauzl open 阶段内置安全校验 → package_layout_invalid）', async () => {
    await expectZipCode(scanZip(buildZip([{ name: '../evil.md', content: 'x' }])), assetErrorCodes.packageLayoutInvalid);
  });

  it('绝对路径 → 拒绝（yauzl 内置 → package_layout_invalid）', async () => {
    await expectZipCode(scanZip(buildZip([{ name: '/etc/passwd', content: 'x' }])), assetErrorCodes.packageLayoutInvalid);
  });

  it('反斜杠文件名 → yauzl 规范化为正斜杠（无穿越风险，条目接受）', async () => {
    const { entries } = await scanZip(buildZip([{ name: 'a\\b.md', content: 'x' }]));
    expect(entries.map((e) => e.path)).toEqual(['a/b.md']);
  });

  it('空段 // → package_path_invalid', async () => {
    await expectZipCode(scanZip(buildZip([{ name: 'a//b.md', content: 'x' }])), assetErrorCodes.packagePathInvalid);
  });

  it('symlink 条目 → package_path_invalid（服务端安全规则）', async () => {
    await expectZipCode(
      scanZip(buildZip([{ name: 'link.md', content: 'SKILL.md', mode: 0o120777 }])),
      assetErrorCodes.packagePathInvalid,
    );
  });

  it('单文件超限 → file_too_large（02 §3.3）', async () => {
    await expectZipCode(
      scanZip(buildZip([{ name: 'big.bin', content: Buffer.alloc(10, 1) }]), SMALL_LIMITS),
      protocolErrorCodes.fileTooLarge,
    );
  });

  it('总量超限 → package_too_large', async () => {
    // 单文件 4B < 5B 上限，但 3×4=12 > 10 总量上限
    const zip = buildZip([
      { name: 'a.md', content: Buffer.alloc(4, 1) },
      { name: 'b.md', content: Buffer.alloc(4, 1) },
      { name: 'c.md', content: Buffer.alloc(4, 1) },
    ]);
    await expectZipCode(scanZip(zip, SMALL_LIMITS), protocolErrorCodes.packageTooLarge);
  });

  it('文件数超限 → too_many_files', async () => {
    // maxFiles=2，第 3 个文件条目触发（单文件/总量均未超）
    const zip = buildZip([
      { name: 'a.md', content: '1' },
      { name: 'b.md', content: '2' },
      { name: 'c.md', content: '3' },
    ]);
    await expectZipCode(scanZip(zip, SMALL_LIMITS), protocolErrorCodes.tooManyFiles);
  });

  it('非 zip 字节 → package_layout_invalid', async () => {
    await expectZipCode(scanZip(Buffer.from('not a zip')), assetErrorCodes.packageLayoutInvalid);
  });
});

describe('readZipEntry', () => {
  it('命中返回内容', async () => {
    const zip = buildZip([{ name: 'SKILL.md', content: 'hello' }]);
    const content = await readZipEntry(zip, 'SKILL.md');
    expect(content.toString()).toBe('hello');
  });

  it('缺失条目 → package_layout_invalid', async () => {
    const zip = buildZip([{ name: 'SKILL.md', content: 'hello' }]);
    await expectZipCode(readZipEntry(zip, 'missing.md'), assetErrorCodes.packageLayoutInvalid);
  });
});

describe('族 validator 骨架（root 级主文件契约）', () => {
  const registry = createValidatorRegistry();

  it('合法 skill 包 → ok（三族分发）', async () => {
    expect((await registry.skill.validate(buildSkillZip())).ok).toBe(true);
    const mcpZip = buildZip([
      {
        name: 'mcp.json',
        content: JSON.stringify({
          name: 'demo',
          description: 'demo mcp',
          servers: { s: { type: 'http', url: 'https://example.com', enabled: true } },
        }),
      },
    ]);
    expect((await registry.mcp.validate(mcpZip)).ok).toBe(true);
    const agentZip = buildZip([{ name: 'agent.md', content: '---\nname: a\ndescription: b\n---\nbody\n' }]);
    expect((await registry.agent.validate(agentZip)).ok).toBe(true);
  });

  it('缺主文件 → package_layout_invalid', async () => {
    const bad = buildZip([{ name: 'notes.md', content: 'x' }]);
    const r = await registry.skill.validate(bad);
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(assetErrorCodes.packageLayoutInvalid);
  });

  it('带外层目录包（my-skill/SKILL.md）→ 拒绝（design §4 root 级契约）', async () => {
    const wrapped = buildZip([
      { name: 'my-skill/SKILL.md', content: '# hi\n' },
      { name: 'my-skill/refs/a.md', content: 'a\n' },
    ]);
    const r = await registry.skill.validate(wrapped);
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(assetErrorCodes.packageLayoutInvalid);
  });

  it('结构违规透传为 issue（不 throw）', async () => {
    const evil = buildZip([{ name: '../x.md', content: 'x' }]);
    const r = await registry.skill.validate(evil);
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(assetErrorCodes.packageLayoutInvalid);
  });
});
