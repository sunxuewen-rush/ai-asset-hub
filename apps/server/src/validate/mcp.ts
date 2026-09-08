/**
 * mcp 族校验器（M2 design §4；03 §3.1 契约：主文件 root 级 mcp.json）。
 * T5：结构校验 + root 级主文件契约；manifest 结构（servers 条目/敏感头规则——
 * zod manifest schema 已含，T8 接线）。
 */
import { assetErrorCodes } from '../assets/errors.js';
import { scanZip, ZipValidationError } from './zip.js';
import type { AssetValidator, ValidationResult } from './types.js';

export const MCP_MAIN_FILE = 'mcp.json';

export function createMcpValidator(): AssetValidator {
  return {
    type: 'mcp',
    async validate(zip: Buffer): Promise<ValidationResult> {
      try {
        const { entries } = await scanZip(zip);
        if (!entries.some((e) => e.path === MCP_MAIN_FILE)) {
          return {
            ok: false,
            errors: [{ code: assetErrorCodes.packageLayoutInvalid, message: 'mcp.json must exist at zip root' }],
          };
        }
        // manifest zod 校验（03 契约）+ 敏感头规则接线随 T8
        return { ok: true, errors: [] };
      } catch (err) {
        if (err instanceof ZipValidationError) {
          return { ok: false, errors: [{ code: err.code, path: err.path, message: err.message }] };
        }
        throw err;
      }
    },
  };
}
