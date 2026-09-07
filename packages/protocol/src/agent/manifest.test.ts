import { describe, expect, it } from 'vitest';
import { AgentManifestSchema } from './manifest.js';

// 示例即契约（01 §6）：04 §3.1 示例同源，真实可读值
const fullFrontmatter = {
  name: 'code-reviewer',
  description: '资深代码评审专家',
  label: '代码评审官',
  icon: 'ShieldCheck',
  color: 'emerald',
  category: 'engineering',
  keywords: ['review', 'lint'],
  'x-aih-default-model': 'gpt-4o', // 平台扩展预留
  // 消费端自定义未知字段——忽略语义 = 不报错且保留
  'custom-consumer-key': { nested: true },
};

describe('AgentManifestSchema', () => {
  it('accepts a full frontmatter and preserves unknown/x-aih fields', () => {
    const result = AgentManifestSchema.safeParse(fullFrontmatter);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.label).toBe('代码评审官');
      expect(result.data.keywords).toEqual(['review', 'lint']);
      expect(result.data['x-aih-default-model']).toBe('gpt-4o');
      expect(result.data['custom-consumer-key']).toEqual({ nested: true });
    }
  });

  it('accepts minimal frontmatter (name + description only)', () => {
    const result = AgentManifestSchema.safeParse({ name: 'minimal', description: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = AgentManifestSchema.safeParse({ description: 'x' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('missing_name');
  });

  it('rejects missing description', () => {
    const result = AgentManifestSchema.safeParse({ name: 'x' });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('missing_description');
  });

  it('rejects description over 1024 chars', () => {
    const result = AgentManifestSchema.safeParse({
      name: 'long-desc',
      description: 'x'.repeat(1025),
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-string keyword element', () => {
    const result = AgentManifestSchema.safeParse({
      name: 'bad-keywords',
      description: 'x',
      keywords: ['ok', 42],
    });
    expect(result.success).toBe(false);
  });
});
