import { z } from 'zod';
import { descriptionSchema, nameSchema } from '../slug.js';

/** 敏感头名（大小写不敏感）：值必须 `${VAR}` 引用，禁止明文（03 §4） */
export const SENSITIVE_HEADER_NAMES = [
  'authorization',
  'x-api-key',
  'api-key',
  'x-api-token',
] as const;

/** `${VAR_NAME}` 引用格式（03 §4） */
export const VAR_REFERENCE_PATTERN = /^\$\{[A-Za-z0-9_]+\}$/;

const serverEntrySchema = z
  .object({
    /** 传输类型（03 §3.2）：必填 */
    type: z.enum(['stdio', 'http', 'sse']),
    /** 是否启用（03 §3.2）：必填 */
    enabled: z.boolean({ required_error: 'enabled_required' }),
    /** stdio：可执行命令，非空、不含反斜杠；`./` 或 `scripts/` 开头 = 包内引用 */
    command: z.string().min(1).refine((v) => !v.includes('\\'), 'command_backslash').optional(),
    /** stdio：命令参数 */
    args: z.array(z.string()).optional(),
    /** stdio：环境变量（值只收字符串） */
    env: z.record(z.string(), z.string()).optional(),
    /** stdio：启动超时秒（默认 30 为消费语义，schema 不设默认） */
    timeout: z.number().int().positive().optional(),
    /** http/sse：合法 http(s) URL */
    url: z.string().url().optional(),
    /** http/sse：请求头 */
    headers: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((entry, ctx) => {
    // 互斥与必填（03 §3.3）：type 与字段必须匹配
    if (entry.type === 'stdio') {
      if (!entry.command) {
        ctx.addIssue({ code: 'custom', path: ['command'], message: 'stdio_requires_command' });
      }
      if (entry.url !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['url'],
          message: 'conflicting_url_with_stdio',
        });
      }
    } else {
      // http / sse
      if (!entry.url) {
        ctx.addIssue({ code: 'custom', path: ['url'], message: 'url_required' });
      } else {
        const protocol = new URL(entry.url).protocol;
        if (protocol !== 'http:' && protocol !== 'https:') {
          ctx.addIssue({ code: 'custom', path: ['url'], message: 'url_must_be_http' });
        }
      }
      if (entry.command !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['command'],
          message: 'conflicting_command_with_url',
        });
      }
    }
    // 敏感头强制 ${VAR} 引用（03 §4）
    for (const [headerName, headerValue] of Object.entries(entry.headers ?? {})) {
      const lower = headerName.toLowerCase();
      if (
        (SENSITIVE_HEADER_NAMES as readonly string[]).includes(lower) &&
        !VAR_REFERENCE_PATTERN.test(headerValue)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['headers', headerName],
          message: 'sensitive_header_plaintext',
        });
      }
    }
  });

/**
 * mcp manifest（03 §3/§4）：
 * - 顶层 name/description 必填 + servers 非空
 * - 兼容导入（03 §3.1）：入参顶层 `mcpServers` / `mcp` 键归一为 `servers`
 * - 未知字段（03 §7 tools 等）passthrough 保留
 */
export const McpManifestSchema = z.preprocess(
  (input) => {
    if (typeof input !== 'object' || input === null) return input;
    const obj = input as Record<string, unknown>;
    const { mcpServers, mcp, ...rest } = obj;
    return { ...rest, servers: obj.servers ?? mcpServers ?? mcp };
  },
  z
    .object({
      name: nameSchema,
      description: descriptionSchema,
      servers: z
        .record(z.string(), serverEntrySchema)
        .refine((servers) => Object.keys(servers).length > 0, 'servers_empty'),
    })
    .passthrough(),
);

export type McpManifest = z.infer<typeof McpManifestSchema>;
