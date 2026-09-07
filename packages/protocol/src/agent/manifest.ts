import { z } from 'zod';
import { descriptionSchema, nameSchema } from '../slug.js';

/**
 * agent manifest（04 §3.1）：agent.md frontmatter 的 schema。
 * - name/description 必填；label/icon/color/category/keywords 可选
 * - 未知字段一律忽略（04 §3.1）= 校验不报错且保留（passthrough，与 skill 同策略）
 * - x-aih-* 平台扩展字段经 passthrough 保留
 */
export const AgentManifestSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    label: z.string().min(1).max(64).optional(),
    icon: z.string().min(1).max(64).optional(),
    color: z.string().min(1).max(32).optional(),
    category: z.string().min(1).max(64).optional(),
    keywords: z.array(z.string()).optional(),
  })
  .passthrough();

export type AgentManifest = z.infer<typeof AgentManifestSchema>;
