import { describe, expect, it } from 'bun:test';
import { protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { buildZip } from '../test-utils/zip-builder.js';
import { createMcpValidator } from './mcp.js';

const validator = createMcpValidator();

function mcpZip(extra: Array<{ name: string; content: string | Buffer }> = [], manifest?: string) {
  const mcpJson =
    manifest ??
    JSON.stringify({
      name: 'demo',
      description: 'demo mcp',
      servers: { s: { type: 'http', url: 'https://example.com', enabled: true } },
    });
  return buildZip([{ name: 'mcp.json', content: mcpJson }, ...extra]);
}

describe('mcp 族规则（03 §2/§3/§4/§5）', () => {
  it('合法远程型包（mcp.json + README.md）→ ok', async () => {
    const r = await validator.validate(mcpZip([{ name: 'README.md', content: '# demo\n' }]));
    expect(r).toEqual({ ok: true, errors: [] });
  });

  it('合法本地型包（scripts/server.js）→ ok', async () => {
    const r = await validator.validate(mcpZip([{ name: 'scripts/server.js', content: 'console.log(1)\n' }]));
    expect(r.ok).toBe(true);
  });

  it('root 杂散文件（非 mcp.json/README.md）→ unsupported_file_type', async () => {
    const r = await validator.validate(mcpZip([{ name: 'notes.txt', content: 'x' }]));
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
    expect(r.errors[0]?.path).toBe('notes.txt');
  });

  it('依赖目录 node_modules/ 入包 → 拒（03 §5）', async () => {
    const r = await validator.validate(
      mcpZip([{ name: 'node_modules/lodash/index.js', content: 'x' }]),
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
  });

  it('scripts/ 内依赖目录（scripts/node_modules/x.js）→ 拒（任意深度）', async () => {
    const r = await validator.validate(
      mcpZip([{ name: 'scripts/node_modules/dep/index.js', content: 'x' }]),
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.path).toBe('scripts/node_modules/dep/index.js');
  });

  it('vendor/ 依赖目录 → 拒', async () => {
    const r = await validator.validate(mcpZip([{ name: 'vendor/foo.js', content: 'x' }]));
    expect(r.ok).toBe(false);
  });

  it('scripts/ 内白名单外扩展名（.txt）→ 拒（03 §5 表无 .txt）', async () => {
    const r = await validator.validate(mcpZip([{ name: 'scripts/notes.txt', content: 'x' }]));
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.unsupportedFileType);
  });

  it('scripts 外未知目录（lib/）→ 拒（03 §2 结构仅 scripts/）', async () => {
    const r = await validator.validate(mcpZip([{ name: 'lib/helper.js', content: 'x' }]));
    expect(r.ok).toBe(false);
  });

  it('mcp.json 坏 JSON → package_layout_invalid', async () => {
    const r = await validator.validate(mcpZip([], '{not json'));
    expect(r.errors[0]?.code).toBe(assetErrorCodes.packageLayoutInvalid);
  });

  it('servers 空对象 → 拒（03 §5 servers 非空）', async () => {
    const r = await validator.validate(
      mcpZip([], JSON.stringify({ name: 'demo', description: 'x', servers: {} })),
    );
    expect(r.ok).toBe(false);
  });

  it('stdio 缺 command → stdio_requires_command（03 §3.3）', async () => {
    const r = await validator.validate(
      mcpZip(
        [],
        JSON.stringify({
          name: 'demo',
          description: 'x',
          servers: { s: { type: 'stdio', enabled: true } },
        }),
      ),
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.stdioRequiresCommand);
  });

  it('敏感头明文 → sensitive_header_plaintext（03 §4 强制 ${VAR} 引用）', async () => {
    const r = await validator.validate(
      mcpZip(
        [],
        JSON.stringify({
          name: 'demo',
          description: 'x',
          servers: {
            s: {
              type: 'http',
              url: 'https://example.com',
              enabled: true,
              headers: { Authorization: 'Bearer tok-123' },
            },
          },
        }),
      ),
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe(protocolErrorCodes.sensitiveHeaderPlaintext);
  });

  it('敏感头 ${VAR} 引用 → ok（03 §4 合规形式）', async () => {
    const r = await validator.validate(
      mcpZip(
        [],
        JSON.stringify({
          name: 'demo',
          description: 'x',
          servers: {
            s: {
              type: 'http',
              url: 'https://example.com',
              enabled: true,
              headers: { Authorization: '${GITHUB_TOKEN}' },
            },
          },
        }),
      ),
    );
    expect(r.ok).toBe(true);
  });

  it('type 枚举外值 → request.invalid 兜底（07 §4 结构化码义务 + 原文可诊断）', async () => {
    const r = await validator.validate(
      mcpZip(
        [],
        JSON.stringify({
          name: 'demo',
          description: 'x',
          servers: { s: { type: 'grpc', enabled: true } },
        }),
      ),
    );
    expect(r.ok).toBe(false);
    expect(r.errors[0]?.code).toBe('request.invalid');
    expect(r.errors[0]?.message).toContain('grpc');
  });
});
