-- M4-pre S2/T5+T6：删除命名空间域（资产坐标扁平化为全局唯一裸 slug）
-- 顺序至关重要：先校验 → 删依赖索引/约束/列 → 建新索引与唯一键 → 最后删表。
-- 手工调整自 drizzle-kit 生成稿：
--   ① 原稿先 `DROP TABLE namespace CASCADE`，会让后续 `DROP CONSTRAINT ..._namespace_id_fkey` 因
--      约束已被级联删除而报错（与 0005 同类的顺序坑）；
--   ② 原稿缺 design §5 P2 要求的「跨空间同名 slug 前置校验」。
-- 唯一键保持 CONSTRAINT 形态（`ADD CONSTRAINT uq_asset_slug UNIQUE`）与 schema 快照一致，
-- 勿改写成 CREATE UNIQUE INDEX——否则后续 drizzle-kit generate 会误判漂移。

-- P2 前置校验（design §5）：跨空间同名 slug 会让 UNIQUE(slug) 失败 → 中止并输出冲突清单
DO $$
DECLARE conflicts text;
BEGIN
  SELECT string_agg(format('  @%s/%s', c.ns_slug, c.slug), E'\n' ORDER BY c.slug, c.ns_slug)
    INTO conflicts
  FROM (
    SELECT a.slug, n.slug AS ns_slug
    FROM asset a JOIN namespace n ON n.id = a.namespace_id
    WHERE a.slug IN (SELECT slug FROM asset GROUP BY slug HAVING count(*) > 1)
  ) c;
  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION E'M4-pre P2：存在跨空间同名 slug，UNIQUE(slug) 无法建立，迁移中止。冲突清单：\n%', conflicts;
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "idx_asset_namespace_status";--> statement-breakpoint
DROP INDEX "idx_review_task_namespace_status";--> statement-breakpoint
ALTER TABLE "asset" DROP CONSTRAINT "uq_asset_namespace_slug";--> statement-breakpoint
ALTER TABLE "asset" DROP COLUMN "namespace_id";--> statement-breakpoint
ALTER TABLE "review_task" DROP COLUMN "namespace_id";--> statement-breakpoint
CREATE INDEX "idx_asset_status" ON "asset" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_review_task_status" ON "review_task" USING btree ("status");--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "uq_asset_slug" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "namespace_member" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "namespace_member" CASCADE;--> statement-breakpoint
ALTER TABLE "namespace" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "namespace" CASCADE;
