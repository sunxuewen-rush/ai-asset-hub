/**
 * skill 族校验器（M2 design §4；02 §2/§3 契约）：
 * - 主文件 root 级，规范名优先 + 大小写变体 fallback（02 §2 兼容）
 * - 全包文件扩展名白名单（02 §3.3——skill 族白名单作用于整个包）
 * - frontmatter 内容契约（02 §3.1/§3.3）：YAML 头段 → SkillManifestSchema
 *   （name/description 必填，未知字段 passthrough——OpenSkills 生态兼容）；
 *   frontmatter 后正文非空（missing_body）
 * zip 结构/超限由 scanZip（base.ts 包装）先行。
 */
import { protocolErrorCodes, SkillManifestSchema } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { extensionOf, runFamilyValidation } from './base.js';
import { parseFrontmatter } from './frontmatter.js';
import type { AssetValidator, ValidationIssue } from './types.js';

export const SKILL_MAIN_FILE = 'SKILL.md';
/** 02 §2：上传兼容大小写变体（服务端归一化为 SKILL.md——落存储时） */
const SKILL_MAIN_VARIANTS: readonly string[] = ['SKILL.md', 'skill.md', 'Skill.md'];
/** 02 §3.3 全包文件扩展名白名单（skill 族作用于整个包） */
const SKILL_EXT_WHITELIST: readonly string[] = [
  '.md', '.txt', '.json', '.yaml', '.yml', '.js', '.cjs', '.mjs',
  '.ts', '.py', '.sh', '.png', '.jpg', '.svg',
];
const WHITELIST = new Set(SKILL_EXT_WHITELIST);

export function createSkillValidator(): AssetValidator {
  return {
    type: 'skill',
    validate: (zip) =>
      runFamilyValidation(zip, async (entries, readFile) => {
        const issues: ValidationIssue[] = [];
        // root 级主文件：精确 SKILL.md 优先，大小写变体仅 fallback（02 §2 兼容——
        // 双主文件并存时以规范名胜出，zip 序无关）
        const main =
          entries.find((e) => !e.path.includes('/') && e.path === SKILL_MAIN_FILE) ??
          entries.find((e) => !e.path.includes('/') && SKILL_MAIN_VARIANTS.includes(e.path));
        if (!main) {
          issues.push({ code: assetErrorCodes.packageLayoutInvalid, message: `${SKILL_MAIN_FILE} must exist at zip root` });
          return { ok: false, errors: issues };
        }
        // 全包扩展名白名单（02 §3.3——无扩展名/白名单外 → unsupported_file_type）
        for (const entry of entries) {
          if (!WHITELIST.has(extensionOf(entry.path))) {
            issues.push({ code: protocolErrorCodes.unsupportedFileType, path: entry.path });
          }
        }
        // frontmatter 内容契约（02 §3.1/§3.3）
        const content = (await readFile(main.path)).toString('utf8');
        const parsed = parseFrontmatter(content);
        if (!parsed.ok) {
          issues.push({ code: protocolErrorCodes.invalidSkillFrontmatter, path: main.path });
        } else {
          const { data, body } = parsed.value;
          const schemaResult = SkillManifestSchema.safeParse(data);
          if (!schemaResult.success) {
            for (const issue of schemaResult.error.issues) {
              issues.push({ code: issue.message, path: main.path });
            }
          }
          if (body.trim().length === 0) {
            issues.push({ code: protocolErrorCodes.missingBody, path: main.path });
          }
        }
        return { ok: issues.length === 0, errors: issues };
      }),
  };
}
