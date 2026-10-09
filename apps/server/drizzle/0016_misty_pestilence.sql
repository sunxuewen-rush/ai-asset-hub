-- M4c-2 T3：user.status 列退休（主 design §4.2 R8/R19 · 批 design §3.5）
-- 执行窗口 = **停服**（先例 0015）；语句序不可换：先按旧三态回填官方封禁列，再删列。
-- 回退口径：按迁移前 user 表快照（含 status 全量值）重建列并回填；快照由执行方在迁移前落盘（不入仓）。

-- ① 非 ACTIVE 行 ⇒ 官方封禁三件套（语句零 PENDING 字样 —— 沿革交 commit message）
UPDATE "user" SET banned = true, ban_reason = '历史状态迁移'
WHERE status IS DISTINCT FROM 'ACTIVE';
--> statement-breakpoint
-- ② 删列（此后启停真值唯一来源 = 官方 banned / banReason / banExpires）
ALTER TABLE "user" DROP COLUMN "status";