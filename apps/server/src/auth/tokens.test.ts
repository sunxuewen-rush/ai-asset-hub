import { describe, expect, it } from 'bun:test';
import { generateTokenSecret, hashToken, maskToken } from './tokens.js';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

describe('api token 生成与哈希', () => {
  it('generateTokenSecret 产出 aih_ 前缀 + 43 位 base64url（总长 47）', () => {
    const token = generateTokenSecret();
    expect(token.startsWith('aih_')).toBe(true);
    expect(token).toHaveLength(47);
    expect(BASE64URL.test(token.slice(4))).toBe(true);
  });

  it('每次生成不同（32B 强随机）', () => {
    expect(generateTokenSecret()).not.toBe(generateTokenSecret());
  });

  it('hashToken 输出 64 位 hex，确定性且不含明文', () => {
    const plain = generateTokenSecret();
    const digest = hashToken(plain);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(plain)).toBe(digest);
    expect(digest).not.toContain(plain);
    // 不同明文 → 不同哈希
    expect(hashToken(plain)).not.toBe(hashToken(generateTokenSecret()));
  });

  it('hashToken 与已知 sha256 一致（契约锁死，防实现漂移）', () => {
    // printf 'aih_contract-check' | shasum -a 256 实证
    expect(hashToken('aih_contract-check')).toBe(
      '2799e86a279c2885edcc69a66d1349cf4268660fa35f1ad81a8249eb1070861a',
    );
  });

  it('maskToken 只泄前缀与末 4，不泄中间', () => {
    const plain = generateTokenSecret();
    const masked = maskToken(plain);
    expect(masked).toBe(`aih_xxxx…${plain.slice(-4)}`);
    expect(masked).not.toContain(plain.slice(4, -4));
    expect(masked.length).toBeLessThan(plain.length);
  });
});
