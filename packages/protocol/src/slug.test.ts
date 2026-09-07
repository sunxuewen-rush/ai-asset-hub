import { describe, expect, it } from 'vitest';
import { slugSchema } from './slug.js';

const valid = ['a', 'my-skill', 'a1', 'x'.repeat(64), 'github-mcp', 'code-reviewer'];
const invalid = [
  ['A', 'uppercase'],
  ['', 'empty'],
  ['a--b', 'consecutive dashes'],
  ['-lead', 'leading dash'],
  ['trail-', 'trailing dash'],
  ['_x', 'underscore'],
  ['my_skill', 'underscore inside'],
  ['x'.repeat(65), 'too long'],
  ['a b', 'space'],
] as const;

describe('slugSchema', () => {
  it('accepts valid slugs', () => {
    for (const value of valid) {
      expect(slugSchema.safeParse(value).success, value).toBe(true);
    }
  });

  it('rejects invalid slugs', () => {
    for (const [value, label] of invalid) {
      expect(slugSchema.safeParse(value).success, `${value} (${label})`).toBe(false);
    }
  });
});
