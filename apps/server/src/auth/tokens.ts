import { randomBytes } from 'node:crypto';

/**
 * API Token 明文生成（05 §5 · 平台通用凭证）。
 *
 * M4b-pre T4：存储/校验/hash 全部交官方 api-key 插件
 * （`base64url(sha256(明文))`，`@better-auth/api-key` `index.mjs:2310`）。
 * 本文件**只剩明文生成器**——它作为官方 `customKeyGenerator` 注入（官方扩展点），
 * 保证签发形态与存量令牌逐字一致（`aih_` + 43 位 base64url，总长 47）：**外契约零变化**。
 * 旧的 `hashToken`/`maskToken` 随切流删除（库中哈希由官方写；列表本就不回明文前缀）。
 */

const TOKEN_PREFIX = 'aih_';
/** 熵源 32B → base64url 43 字符（无填充），明文总长 47 */
const SECRET_BYTES = 32;

/** 生成明文 token：`aih_` + 43 位 base64url（crypto 强随机） */
export function generateTokenSecret(): string {
  return `${TOKEN_PREFIX}${randomBytes(SECRET_BYTES).toString('base64url')}`;
}
