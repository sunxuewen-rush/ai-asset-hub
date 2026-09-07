import { z } from 'zod';
import { descriptionSchema, nameSchema } from '../slug.js';

/**
 * skill manifest（02 §3.1）：SKILL.md frontmatter 的 schema。
 * - name 必填（slug 规则）· description 必填 ≤1024
 * - 未知字段 passthrough：OpenSkills/Claude 生态扩展字段（allowed-tools/metadata 等）
 *   向前兼容，解析结果持久化于 parsed_metadata_json（02 §3.1）
 */
export const SkillManifestSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
  })
  .passthrough();

export type SkillManifest = z.infer<typeof SkillManifestSchema>;
