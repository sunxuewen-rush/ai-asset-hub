-- M4b-pre T4 · 令牌面收口（design §5.3 / R7）：`api_token` → 官方 `apikey` + 删旧表
--
-- 生成器（drizzle-kit）产物只有 `DROP TABLE "api_token" CASCADE;`——搬迁规则（re-encode /
-- permissions / 状态映射）无法由 schema diff 表达 ⇒ 手工补全，保持**前向单一路径**（先搬后删）。
--
-- 关键规则（逐条对应 design §5.3）：
-- 1. 明文不变（持有者无感）：官方存储 = base64url(sha256(明文))，旧存储 = sha256(明文) hex
--    ⇒ 同一字节串换编码：translate(rtrim(encode(decode(token_hash,'hex'),'base64'),'='), '+/', '-_')
--    （沙箱 X7 端到端实证：写回后原明文仍被官方 verifyApiKey 判 valid，错明文被拒）
-- 2. `scope`（逗号串）→ 官方 `permissions`（JSON **文本**列，官方源码 `JSON.stringify(permissions)`）：
--    `asset:publish,review:submit` → `{"asset":["publish"],"review":["submit"]}`；
--    空串 / `cli`（历史全量语义）→ NULL（= 官方「无 permissions 限制」= 全量）
--    两层聚合：先按 resource 收集 actions（jsonb_agg），再按行聚合为对象（jsonb_object_agg）
--    ——单层聚合会**静默只保留最后一项**（实测：asset:publish,asset:manage → {"asset":"manage"}，
--      publish 被丢弃且不报错）⇒ 必须两层聚合才能保全动作集
-- 3. `enabled` = `revoked_at IS NULL`（吊销语义 = 官方 KEY_DISABLED，保留行 ⇒ 列表仍可见 revokedAt）
-- 4. `rate_limit_enabled = false`（R7 全局关官方限流）；窗口/上限填官方默认值（不参与判定）
-- 5. `start`/`prefix` = NULL（官方仅用于展示，旧库本就无明文前缀 ⇒ 列表展示口径不变）
-- 6. 时间列：官方表为 `timestamp`（无时区，**naive UTC** 约定——实证 `user.created_at`）；
--    旧表为 `timestamptz` ⇒ 显式 `AT TIME ZONE 'UTC'` 归一（不依赖会话时区）
INSERT INTO "apikey" (
  "id",
  "config_id",
  "name",
  "start",
  "prefix",
  "reference_id",
  "key",
  "enabled",
  "rate_limit_enabled",
  "rate_limit_time_window",
  "rate_limit_max",
  "request_count",
  "expires_at",
  "created_at",
  "updated_at",
  "permissions"
)
SELECT
  t.id::text,
  'default',
  NULL,
  NULL,
  NULL,
  t.user_id,
  translate(rtrim(encode(decode(t.token_hash, 'hex'), 'base64'), '='), '+/', '-_'),
  (t.revoked_at IS NULL),
  false,
  86400000,
  10,
  0,
  t.expires_at AT TIME ZONE 'UTC',
  t.created_at AT TIME ZONE 'UTC',
  COALESCE(t.revoked_at, t.created_at) AT TIME ZONE 'UTC',
  p.perms
FROM "api_token" t
LEFT JOIN LATERAL (
  SELECT jsonb_object_agg(res, acts)::text AS perms
  FROM (
    SELECT split_part(sp, ':', 1) AS res, jsonb_agg(split_part(sp, ':', 2)) AS acts
    FROM unnest(string_to_array(t.scope, ',')) AS sp
    WHERE t.scope IS NOT NULL
      AND t.scope <> ''
      AND t.scope <> 'cli'
      AND sp <> ''
      AND split_part(sp, ':', 1) <> ''
      AND split_part(sp, ':', 2) <> ''
    GROUP BY split_part(sp, ':', 1)
  ) x
) p ON true;
--> statement-breakpoint
DROP TABLE "api_token" CASCADE;
