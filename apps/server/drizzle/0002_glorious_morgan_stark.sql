ALTER TABLE "asset" ALTER COLUMN "latest_version_id" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "asset" ALTER COLUMN "latest_version_id" DROP NOT NULL;--> statement-breakpoint
-- M1 bigserial 误用手工修正（指针列无自增语义）：drop 序列默认 + 存量伪值清 null
-- （M2 无 PUBLISHED 版本——latest 语义 = 跟随最新 PUBLISHED，全 null 即正确）
ALTER TABLE "asset" ALTER COLUMN "latest_version_id" DROP DEFAULT;--> statement-breakpoint
UPDATE "asset" SET "latest_version_id" = NULL;