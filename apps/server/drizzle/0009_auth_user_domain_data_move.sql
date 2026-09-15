-- M4b-pre T3 · 用户域数据搬迁（design §5.1 时序原则 · §5.2 列级规则）
--
-- 与「认证面切流」**同批**执行：搬迁完成 + 代码切换 ⇒ 官方 6 表成为唯一真值源。
-- 0008 只建结构（零数据）；本迁移只搬数据；FK 重指向与旧表删除在 0010。
--
-- 幂等性：本迁移是**一次性前向迁移**（forward-only 纪律）——执行后旧表即被 0010 删除，
-- 不存在重复执行路径，故不加 ON CONFLICT（重复执行会被唯一约束显式拦下，不会静默改写）。

-- ① 前置校验：邮箱归一后不得重复（官方 `user.email` 为 UNIQUE；重复即中止并报可行动的错）
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT lower(email) AS normalized
    FROM user_account
    WHERE email IS NOT NULL
    GROUP BY 1
    HAVING count(*) > 1
  ) duplicated;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'migration 0009: % duplicate email(s) after lower() normalization in user_account; resolve them before migrating (official user.email is UNIQUE)', dup_count;
  END IF;
END $$;

-- ② user_account → user（列级规则：display_name→name · avatar_url→image · role 数值→档名文本 ·
--    email 缺失按 `id || '@local'` 补齐（唯一且确定性）· 工号取目录身份 subject 优先 ldap）
INSERT INTO "user" (
  id, name, email, email_verified, image, created_at, updated_at,
  username, display_username, role, banned, status
)
SELECT
  a.id,
  a.display_name,
  COALESCE(lower(a.email), a.id || '@local'),
  false,
  a.avatar_url,
  a.created_at,
  a.updated_at,
  binding.provider_subject,
  binding.provider_subject,
  CASE
    WHEN a.role >= 100 THEN 'superadmin'
    WHEN a.role >= 10 THEN 'admin'
    ELSE 'user'
  END,
  false,
  a.status
FROM user_account a
LEFT JOIN LATERAL (
  SELECT b.provider_subject
  FROM identity_binding b
  WHERE b.user_id = a.id
  ORDER BY (b.provider = 'ldap') DESC, b.id ASC
  LIMIT 1
) AS binding ON true;

-- ③ identity_binding → account（provider → provider_id · provider_subject → account_id；
--    补官方 token 列：本批全 NULL——无 OIDC token 持久化需求，按官方默认留空）
INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at)
SELECT
  'acc_ib_' || b.id,
  b.provider_subject,
  b.provider,
  b.user_id,
  b.created_at,
  b.updated_at
FROM identity_binding b;

-- ④ local_credential → account（password_hash → password · username → account_id ·
--    provider_id = 'credential'）——口令哈希原样搬迁 ⇒ **存量口令零重置**（R10）
--    `failed_attempts` / `locked_until` **不迁**：防爆破交官方限流语义（design §10 I2）
INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
SELECT
  'acc_lc_' || c.id,
  c.username,
  'credential',
  c.user_id,
  c.password_hash,
  c.created_at,
  c.updated_at
FROM local_credential c;
