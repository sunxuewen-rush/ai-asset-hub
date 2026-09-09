/**
 * agent 族校验器（M2 design §4；04 §2/§3/§4/§5 契约）：
 * - 主文件 root 级 agent.md + README.md（可选）
 * - assets/** 内扩展名白名单（04 §4：.md .txt .png .jpg .svg .webp）
 * - agent.md 内容：frontmatter → AgentManifestSchema（04 §3.1/§5）+ 正文非空（04 §3.2）
 */
import { AgentManifestSchema, protocolErrorCodes } from '@ai-asset-hub/protocol';
import { assetErrorCodes } from '../assets/errors.js';
import { extensionOf, runFamilyValidation, zodIssuesToValidation } from './base.js';
import { parseFrontmatter } from './frontmatter.js';
import type { AssetValidator, ValidationIssue } from './types.js';

export const AGENT_MAIN_FILE = 'agent.md';
/** root 级允许文件（04 §2：主文件 + 可选 README） */
const ROOT_ALLOWED = new Set([AGENT_MAIN_FILE, 'README.md']);
/** 04 §4：assets/ 内扩展名白名单 */
const ASSETS_EXT_WHITELIST = new Set(['.md', '.txt', '.png', '.jpg', '.svg', '.webp']);

export function createAgentValidator(): AssetValidator {
  return {
    type: 'agent',
    validate: (zip) =>
      runFamilyValidation(zip, async (entries, readFile) => {
        const issues: ValidationIssue[] = [];
        const main = entries.find((e) => e.path === AGENT_MAIN_FILE);
        if (!main) {
          issues.push({
            code: assetErrorCodes.packageLayoutInvalid,
            message: `${AGENT_MAIN_FILE} must exist at zip root`,
          });
          return { ok: false, errors: issues };
        }
        for (const entry of entries) {
          if (ROOT_ALLOWED.has(entry.path)) continue;
          const segments = entry.path.split('/');
          // 仅 assets/** 收文件 + 扩展名白名单（04 §4——root 杂散/未知目录拒）
          if (segments[0] !== 'assets' || !ASSETS_EXT_WHITELIST.has(extensionOf(entry.path))) {
            issues.push({ code: protocolErrorCodes.unsupportedFileType, path: entry.path });
          }
        }
        // agent.md 内容：frontmatter → AgentManifestSchema（04 §3.1）+ 正文非空（04 §3.2）
        const content = (await readFile(AGENT_MAIN_FILE)).toString('utf8');
        const parsed = parseFrontmatter(content);
        if (!parsed.ok) {
          issues.push({ code: protocolErrorCodes.invalidAgentFrontmatter, path: AGENT_MAIN_FILE });
        } else {
          const { data, body } = parsed.value;
          const schemaResult = AgentManifestSchema.safeParse(data);
          if (!schemaResult.success) {
            issues.push(...zodIssuesToValidation(schemaResult.error, AGENT_MAIN_FILE));
          }
          if (body.trim().length === 0) {
            issues.push({ code: protocolErrorCodes.missingBody, path: AGENT_MAIN_FILE });
          }
        }
        return { ok: issues.length === 0, errors: issues };
      }),
  };
}
