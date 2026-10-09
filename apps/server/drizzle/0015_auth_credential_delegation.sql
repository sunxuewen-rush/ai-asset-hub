-- M4c-1 T4 · 凭据委派行对齐（批 design §6.1 / §6.2 · 主 design R8）
--
-- 目的：让官方 `sign-in/username` 的凭据查找对**存量**账号成立 —— 官方三条件
--       `provider_id = 'credential' AND account_id = user_id AND password 非空`
--       （`better-auth/dist/db/internal-adapter.mjs:652-668`）。
-- 分工：**新**账号的委派行由 M4c-1 T3 的建号钩子经 `identity.ensureDirectoryUser` 在**建号事务内**写入
--       （可选入参 `delegatedPassword`，批 design §5.1）；本迁移只负责**存量**账号，两者口径一致。
--
-- 幂等：① 靠 `IS DISTINCT FROM`（重跑零影响）② 靠 `NOT EXISTS`（已存在 credential 行则跳过
--       ⇒ **不覆盖本仓本地账号的真实口令行**）。全新库 / 空库两条语句自然零命中。
-- 不改哈希：不动任何既有 `password` 值；语句 ② 只**新增**标记行（`ldap:<工号>` 为非空标记，非密文）。
-- 执行窗口：**停服**（服务停写）⇒ 执行后**立即**跑批 design §6.4 的 P1–P4 探针；
--           失败即停并保留现场（迁移前对 `user` / `account` 两表做一次快照备份）。

-- ① credential 行 accountId 语义归一（工号 → user.id）

-- 官方 findCredentialAccount 的三条件要求 account_id = user_id
-- （better-auth/dist/db/internal-adapter.mjs:652-668）
UPDATE "account"
SET "account_id" = "user_id"
WHERE "provider_id" = 'credential'
  AND "account_id" IS DISTINCT FROM "user_id";

-- ② 为既有目录账号补齐凭据委派行（只补缺）

-- 目录账号判定 = 存在 provider_id ∈ ('ldap','oidc') 的行（0009 迁移 ③ 由 identity_binding 搬入）
-- 登录名择优：优先 ldap 行的 account_id（与 0009 同款 LATERAL 排序），无则取 oidc 行
INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
SELECT
  'cred-' || u."id",
  u."id",
  'credential',
  u."id",
  'ldap:' || d."account_id",
  now(),
  now()
FROM "user" u
JOIN LATERAL (
  SELECT a2."account_id"
  FROM "account" a2
  WHERE a2."user_id" = u."id" AND a2."provider_id" IN ('ldap', 'oidc')
  ORDER BY (a2."provider_id" = 'ldap') DESC, a2."id" ASC
  LIMIT 1
) d ON true
WHERE NOT EXISTS (
  SELECT 1 FROM "account" a
  WHERE a."user_id" = u."id" AND a."provider_id" = 'credential'
);
