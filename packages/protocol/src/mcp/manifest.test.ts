import { describe, expect, it } from 'bun:test';
import { McpManifestSchema } from './manifest.js';

// 示例即契约（01 §6）：mcp.json 真实可读值（03 §3 示例同源）
const remoteHttpManifest = {
  name: 'github-mcp',
  description: '连接 GitHub 的 MCP 服务器',
  servers: {
    github: {
      type: 'http',
      url: 'https://mcp.example.com/github',
      headers: { Authorization: '${GITHUB_TOKEN}' },
      enabled: true,
    },
  },
};

const stdioManifest = {
  name: 'log-analyzer',
  description: '本地日志分析 MCP 服务器',
  servers: {
    analyzer: {
      type: 'stdio',
      command: 'node',
      args: ['scripts/server.js'],
      env: { LOG_LEVEL: 'info' },
      timeout: 30,
      enabled: true,
    },
  },
};

const sseManifest = {
  name: 'event-stream',
  description: 'SSE 推送的 MCP 服务器',
  servers: {
    stream: { type: 'sse', url: 'https://mcp.example.com/sse', enabled: true },
  },
};

// mcpServers 键（Claude Code 系写法）导入归一
const mcpServersKeyManifest = {
  name: 'legacy-style',
  description: '兼容 mcpServers 键写法',
  mcpServers: {
    github: {
      type: 'http',
      url: 'https://mcp.example.com/github',
      enabled: true,
    },
  },
  tools: ['get_issue', 'list_prs'], // 03 §7 可选展示字段
};

describe('McpManifestSchema', () => {
  it('accepts remote http manifest with ${VAR} header', () => {
    const result = McpManifestSchema.safeParse(remoteHttpManifest);
    expect(result.success).toBe(true);
  });

  it('accepts stdio manifest with package-internal script', () => {
    const result = McpManifestSchema.safeParse(stdioManifest);
    expect(result.success).toBe(true);
  });

  it('accepts sse manifest', () => {
    const result = McpManifestSchema.safeParse(sseManifest);
    expect(result.success).toBe(true);
  });

  it('normalizes mcpServers key into servers and keeps unknown top-level fields', () => {
    const result = McpManifestSchema.safeParse(mcpServersKeyManifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.servers.github).toBeDefined();
      expect(result.data.servers.legacy).toBeUndefined();
      expect('mcpServers' in result.data).toBe(false);
      expect(result.data.tools).toEqual(['get_issue', 'list_prs']);
    }
  });

  it('rejects plaintext sensitive header', () => {
    const manifest = {
      name: 'leaky',
      description: 'x',
      servers: {
        s: {
          type: 'http',
          url: 'https://mcp.example.com/github',
          headers: { Authorization: 'Bearer real-token-value' },
          enabled: true,
        },
      },
    };
    const result = McpManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('sensitive_header_plaintext');
  });

  it('rejects stdio declared but url given (conflict)', () => {
    const manifest = {
      name: 'conflict',
      description: 'x',
      servers: {
        s: { type: 'stdio', command: 'node', url: 'https://x.example.com', enabled: true },
      },
    };
    const result = McpManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('conflicting_url_with_stdio');
  });

  it('rejects http without url', () => {
    const manifest = {
      name: 'no-url',
      description: 'x',
      servers: { s: { type: 'http', enabled: true } },
    };
    const result = McpManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('url_required');
  });

  it('rejects empty servers object', () => {
    const result = McpManifestSchema.safeParse({ name: 'empty', description: 'x', servers: {} });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('servers_empty');
  });

  it('rejects missing enabled', () => {
    const manifest = {
      name: 'no-enabled',
      description: 'x',
      servers: { s: { type: 'http', url: 'https://mcp.example.com/github' } },
    };
    const result = McpManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it('rejects command with backslash', () => {
    const manifest = {
      name: 'backslash',
      description: 'x',
      servers: {
        s: { type: 'stdio', command: 'C:\\\\node.exe', enabled: true },
      },
    };
    const result = McpManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('command_backslash');
  });
});
