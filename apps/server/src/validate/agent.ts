/**
 * agent 族校验器（M2 design §4；04 §3 契约：主文件 root 级 agent.md）。
 * T5：结构校验 + root 级主文件契约；frontmatter 细则随 T8。
 */
import { assetErrorCodes } from '../assets/errors.js';
import { scanZip, ZipValidationError } from './zip.js';
import type { AssetValidator, ValidationResult } from './types.js';

export const AGENT_MAIN_FILE = 'agent.md';

export function createAgentValidator(): AssetValidator {
  return {
    type: 'agent',
    async validate(zip: Buffer): Promise<ValidationResult> {
      try {
        const { entries } = await scanZip(zip);
        if (!entries.some((e) => e.path === AGENT_MAIN_FILE)) {
          return {
            ok: false,
            errors: [{ code: assetErrorCodes.packageLayoutInvalid, message: 'agent.md must exist at zip root' }],
          };
        }
        // frontmatter/body 细则随 T8
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
