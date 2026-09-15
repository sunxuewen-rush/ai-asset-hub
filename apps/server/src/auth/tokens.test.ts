import { describe, expect, it } from 'bun:test';
import { generateTokenSecret } from './tokens.js';

/**
 * 明文生成器测试（M4b-pre T4：存储/校验/hash 全交官方 api-key，本文件只覆盖生成器契约）。
 * 形态 = `aih_` + 43 位 base64url（32B 熵）——作为官方 `customKeyGenerator` 注入 ⇒ **外契约零变化**。
 */

describe('generateTokenSecret（官方 customKeyGenerator 注入点）', () => {
  it('产出 aih_ 前缀 + 43 位 base64url（总长 47）', () => {
    const token = generateTokenSecret();
    expect(token.startsWith('aih_')).toBe(true);
    expect(token).toHaveLength(47);
    expect(token.slice(4)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('每次不同（crypto 强随机）', () => {
    expect(generateTokenSecret()).not.toBe(generateTokenSecret());
  });
});
