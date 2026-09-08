/**
 * mcp 族校验器（M2 design §4；03 §2/§3/§4/§5 契约）：
 * - 主文件 root 级 mcp.json + README.md（可选）——root 只允许两者
 * - scripts/** 内扩展名白名单（03 §5：.json .md .js .cjs .mjs .ts .py .sh .png .svg）
 * - 依赖目录禁止（03 §5：node_modules/、vendor/ 等任意位置拒入——脚本包保持轻量）
 * - mcp.json 内容：JSON → McpManifestSchema（servers 双形态互斥/敏感头 ${VAR} 强制，
 *   03 §3.2/§3.3/§4——protocol 已含，此处接线）
 */
import { McpManifestSchema, protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { extensionOf, runFamilyValidation, zodIssuesToValidation } from './base.js';
import type { AssetValidator, ValidationIssue } from './types.js';

export const MCP_MAIN_FILE = 'mcp.json';
/** root 级允许文件（03 §2：主文件 + 可选 README） */
const ROOT_ALLOWED = new Set([MCP_MAIN_FILE, 'README.md']);
/** 03 §5：scripts/ 内扩展名白名单 */
const SCRIPTS_EXT_WHITELIST = new Set([
  '.json', '.md', '.js', '.cjs', '.mjs', '.ts', '.py', '.sh', '.png', '.svg',
]);
/** 03 §5：依赖目录禁止入包（任意深度） */
const FORBIDDEN_DIRS = new Set(['node_modules', 'vendor']);

export function createMcpValidator(): AssetValidator {
  return {
    type: 'mcp',
    validate: (zip) =>
      runFamilyValidation(zip, async (entries, readFile) => {
        const issues: ValidationIssue[] = [];
        const main = entries.find((e) => e.path === MCP_MAIN_FILE);
        if (!main) {
          issues.push({ code: assetErrorCodes.packageLayoutInvalid, message: `${MCP_MAIN_FILE} must exist at zip root` });
          return { ok: false, errors: issues };
        }
        for (const entry of entries) {
          if (ROOT_ALLOWED.has(entry.path)) continue;
          const segments = entry.path.split('/');
          // 依赖目录禁止（03 §5——scripts/node_modules 亦拒）
          if (segments.some((s) => FORBIDDEN_DIRS.has(s))) {
            issues.push({ code: protocolErrorCodes.unsupportedFileType, path: entry.path, message: 'dependency dirs are not allowed in package' });
            continue;
          }
          // 仅 scripts/** 收文件，且扩展名白名单（03 §5——root 杂散/未知目录拒）
          if (segments[0] !== 'scripts' || !SCRIPTS_EXT_WHITELIST.has(extensionOf(entry.path))) {
            issues.push({ code: protocolErrorCodes.unsupportedFileType, path: entry.path });
          }
        }
        // mcp.json 内容：JSON → McpManifestSchema（03 §3/§4 全规则——protocol 接线）
        try {
          const raw = (await readFile(MCP_MAIN_FILE)).toString('utf8');
          const json: unknown = JSON.parse(raw);
          const schemaResult = McpManifestSchema.safeParse(json);
          if (!schemaResult.success) {
            issues.push(...zodIssuesToValidation(schemaResult.error, MCP_MAIN_FILE));
          }
        } catch (err) {
          if (err instanceof SyntaxError) {
            issues.push({ code: assetErrorCodes.packageLayoutInvalid, path: MCP_MAIN_FILE, message: 'mcp.json is not valid json' });
          } else {
            throw err;
          }
        }
        return { ok: issues.length === 0, errors: issues };
      }),
  };
}
