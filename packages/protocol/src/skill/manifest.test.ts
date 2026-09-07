import { describe, expect, it } from 'bun:test';
import { SkillManifestSchema } from './manifest.js';

// 示例即契约（01 §6）：真实可读 frontmatter 值
const validFrontmatter = {
  name: 'my-skill',
  description: 'When to use this skill for summarizing meeting notes.',
  // OpenSkills/Claude 生态未知字段——必须保留不报错
  allowedTools: ['bash', 'read'],
  metadata: { tags: ['meeting'] },
};

describe('SkillManifestSchema', () => {
  it('accepts a valid OpenSkills-style frontmatter and keeps unknown fields', () => {
    const result = SkillManifestSchema.safeParse(validFrontmatter);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('my-skill');
      expect(result.data.allowedTools).toEqual(['bash', 'read']);
      expect(result.data.metadata).toEqual({ tags: ['meeting'] });
    }
  });

  it('rejects missing name', () => {
    const result = SkillManifestSchema.safeParse({ description: 'x' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('missing_name');
  });

  it('rejects invalid name (uppercase / underscore)', () => {
    for (const name of ['MySkill', 'my_skill']) {
      const result = SkillManifestSchema.safeParse({ name, description: 'x' });
      expect(result.success, name).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain('invalid_name');
    }
  });

  it('rejects missing description', () => {
    const result = SkillManifestSchema.safeParse({ name: 'my-skill' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('missing_description');
  });

  it('rejects description over 1024 chars', () => {
    const result = SkillManifestSchema.safeParse({
      name: 'my-skill',
      description: 'x'.repeat(1025),
    });
    expect(result.success).toBe(false);
  });
});
