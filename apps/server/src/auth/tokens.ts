import { createHash, randomBytes } from 'node:crypto';

/**
 * API Token 工具（05 §5 · 08 §3 api_token 契约）。
 * 明文仅签发响应出现一次；库中只存 sha256 hex（64 字符，匹配 token_hash VARCHAR(64)）。
 */

const TOKEN_PREFIX = 'aih_';
/** 熵源 32B → base64url 43 字符（无填充），明文总长 47 */
const SECRET_BYTES = 32;

/** 生成明文 token：`aih_` + 43 位 base64url（crypto 强随机） */
export function generateTokenSecret(): string {
  return `${TOKEN_PREFIX}${randomBytes(SECRET_BYTES).toString('base64url')}`;
}

/** sha256 hex（64 字符）——落库形态；不可逆，明文不落库 */
export function hashToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

/** 展示掩码：`aih_xxxx…末4`（列表/日志可见形态，不泄全量） */
export function maskToken(plain: string): string {
  return `aih_xxxx…${plain.slice(-4)}`;
}
