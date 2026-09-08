ALTER TABLE "label_definition" ALTER COLUMN "parent_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "label_definition" ALTER COLUMN "parent_id" DROP NOT NULL;--> statement-breakpoint
-- M1 bigserial 误用修复（parent_id 是一级 label 的空指针——serial 隐含 NOT NULL + 自增，
-- 一级 label 无法表达）：drop 序列默认（同 0002 latest_version_id 模式）
ALTER TABLE "label_definition" ALTER COLUMN "parent_id" DROP DEFAULT;