import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

/**
 * 密码哈希（R3）：node:crypto scrypt，零 native 依赖。
 * 存储格式：`$scrypt$N$r$p$<salt b64>$<hash b64>`（参数自描述，支持未来升级）。
 */

// OWASP 推荐参数：N=2^17, r=8, p=1
const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SALT_LEN = 16;
// maxmem 必传：128·N·r ≈ 128 MiB > Node 默认 maxmem 32 MiB（不设会运行时报错）；2 倍裕量
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keylen,
      { N: n, r, p, maxmem: SCRYPT_MAXMEM },
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return `$scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** 校验：格式解析失败返回 false（不抛），参数取自存储串（自描述） */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  // ['', 'scrypt', N, r, p, salt, hash] = 7 段
  if (parts.length !== 7 || parts[0] !== '' || parts[1] !== 'scrypt') return false;

  const n = Number(parts[2]);
  const r = Number(parts[3]);
  const p = Number(parts[4]);
  // N 必须为 >1 的 2 的幂（node:crypto 参数约束）
  if (!Number.isInteger(n) || n <= 1 || (n & (n - 1)) !== 0) return false;
  if (!Number.isInteger(r) || r < 1 || !Number.isInteger(p) || p < 1) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[5] ?? '', 'base64');
    expected = Buffer.from(parts[6] ?? '', 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scrypt(password, salt, expected.length, n, r, p);
  } catch {
    return false;
  }
  return timingSafeEqual(actual, expected);
}
