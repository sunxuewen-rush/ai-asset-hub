import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing (scrypt)', () => {
  it('hash output is not the plaintext and is self-describing', async () => {
    const stored = await hashPassword('correct horse battery staple');
    expect(stored.startsWith('$scrypt$')).toBe(true);
    expect(stored).not.toContain('correct horse');
    expect(stored.split('$')).toHaveLength(7);
  });

  it('verifies the correct password', async () => {
    const stored = await hashPassword('s3cret-pass');
    await expect(verifyPassword('s3cret-pass', stored)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('right-password');
    await expect(verifyPassword('wrong-password', stored)).resolves.toBe(false);
  });

  it('uses a fresh salt per hash (same password, different stored)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });

  it('returns false (not throws) for malformed stored strings', async () => {
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('x', '$scrypt$abc')).resolves.toBe(false);
    await expect(verifyPassword('x', '$bcrypt$10$abc')).resolves.toBe(false);
    // N 非 2 幂 → 拒绝
    await expect(verifyPassword('x', '$scrypt$100$8$1$c2FsdA==$aGFzaA==')).resolves.toBe(false);
    // base64 损坏 → 拒绝（不抛）
    await expect(
      verifyPassword('x', '$scrypt$131072$8$1$!!!not-base64!!!$!!!bad!!!'),
    ).resolves.toBe(false);
  });
});
