/**
 * skill 族校验器（M2 design §4；02 §3 契约：主文件 root 级 SKILL.md + 扩展名白名单等）。
 * T5：结构校验（scanZip）+ root 级主文件契约；族细则（references 布局/白名单扩展名/
 * frontmatter 内容）随 T6/T7 填充。
 */
import { assetErrorCodes } from '../assets/errors.js';
import { scanZip, ZipValidationError } from './zip.js';
import type { AssetValidator, ValidationResult } from './types.js';

export const SKILL_MAIN_FILE = 'SKILL.md';

export function createSkillValidator(): AssetValidator {
  return {
    type: 'skill',
    async validate(zip: Buffer): Promise<ValidationResult> {
      try {
        const { entries } = await scanZip(zip);
        // design §4 root 级契约：主文件须在包根——缺/带外层目录（my-skill/SKILL.md）→ 结构错
        if (!entries.some((e) => e.path === SKILL_MAIN_FILE)) {
          return {
            ok: false,
            errors: [{ code: assetErrorCodes.packageLayoutInvalid, message: 'SKILL.md must exist at zip root' }],
          };
        }
        // 族细则（references/scripts 布局、白名单扩展名、frontmatter 契约）随 T6/T7 填充
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
