import type { LdapChannel } from './ldap.js';

/**
 * 存值前缀分派 + 假哈希（M4c-1 T2 · 批 design §5.2 / 主 design §3.2）。
 *
 * 为什么需要本件：官方在 `emailAndPassword.password.verify` 只给 `{ hash, password }`
 * —— **拿不到用户名**，无法在钩子里做目录 bind（M4b-pre design §1.4）。本批按批 design §5.2
 * 在此按**存值前缀**分派：
 *
 * | 存值形态 | 处理 |
 * |---------|------|
 * | `ldap:<工号>`（凭据委派行标记，迁移 `0015` 写入） | 本仓目录 `bind` |
 * | 其他（**本仓 scrypt** 自描述哈希 `$scrypt$N$r$p$salt$hash`） | 本仓 `verifyPassword` |
 *
 * ⚠️ **不得**改走官方 `better-auth/crypto` 的 `verifyPassword`（**F279**）：官方格式
 * `saltHex:keyHex`（N=16384 · r=16 · dkLen=64 · 口令做 NFKC 归一）与本仓
 * `$scrypt$N$r$p$saltB64$hashB64`（N=131072 · r=8 · dkLen=32）**互不认**；实测官方 verify
 * 在本仓哈希上**抛 `Invalid password hash`** ⇒ 会让存量本地账号一律 500，并违反 R10 零重置。
 *
 * 本件**不引** `better-auth.ts`（scrypt 校验函数由调用方注入）—— 避免 `better-auth → 插件 → 本件`
 * 的循环导入。
 */

/** 凭据委派行的**标记前缀**（`ldap:<工号>`；值非密文，只为把登录名带进 `verify`） */
export const DIRECTORY_CREDENTIAL_PREFIX = 'ldap:';

/**
 * D9 防时序枚举：无凭据也执行一次 verify（内容任意、格式合法即可），
 * 抹平「用户不存在 vs 密码错」的耗时差（scrypt 参数自描述，不需要真实口令）。
 *
 * M4c-1 T2 起同时用于目录分支的**等价耗时**（批 design §8 安全表：不得凭响应时间区分
 * 「目录账号 / 本地账号 / 账号不存在」）—— 目录 `bind` 通常快于本地 scrypt ⇒ 目录分支
 * 额外跑一次本哈希的校验把两条路径的耗时拉齐。
 */
export const DUMMY_PASSWORD_HASH =
  '$scrypt$131072$8$1$c2FsdC1kdW1teS1zYWx0LXNhbHQtc2FsdA==$aXMtbm90LWEtcmVhbC1oYXNoLWJ1dC12ZXJpZnktcnVucw==';

/** 注入的本仓 scrypt 校验（签名与 `better-auth.ts` 的 `verifyPassword` 一致） */
export type ScryptVerifier = (password: string, stored: string) => Promise<boolean>;

/**
 * `password.verify` 的前缀分派实现（装配点在 `better-auth.ts`；本函数为可直测的纯逻辑）。
 *
 * @param hash     存值（`account.password`）
 * @param password 请求携带的口令
 * @param ldap     目录通道（`null` = 目录未启用 ⇒ 目录分支一律失败，不泄露账号存在性）
 * @param verifyScrypt 本仓 scrypt 校验（注入，避免循环导入）
 */
export async function verifyCredential(
  hash: string,
  password: string,
  ldap: LdapChannel | null,
  verifyScrypt: ScryptVerifier,
): Promise<boolean> {
  if (!hash.startsWith(DIRECTORY_CREDENTIAL_PREFIX)) {
    // 本地账号（含本仓种子账号）：本仓 scrypt 原样校验 —— 存量零回归
    return verifyScrypt(password, hash);
  }

  const loginName = hash.slice(DIRECTORY_CREDENTIAL_PREFIX.length);
  if (!ldap || loginName === '') {
    // 目录未启用 / 标记行无登录名：花等价耗时后判失败（不区分原因，不泄露）
    await verifyScrypt(password, DUMMY_PASSWORD_HASH);
    return false;
  }

  const result = await ldap.authenticate(loginName, password);
  // 等价耗时：bind 命中/未命中都要与本地分支同量级（目录不可达时 bind 更快 ⇒ 仍需补齐）
  await verifyScrypt(password, DUMMY_PASSWORD_HASH);
  return result.status === 'ok';
}
