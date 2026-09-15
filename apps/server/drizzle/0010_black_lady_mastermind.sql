-- M4b-pre T3 · 用户域收口（design §5.1 时序原则）
--
-- 两件事，**顺序关键**（drizzle-kit 生成的原始顺序是「先 DROP 表再重指向 FK」——
-- `DROP TABLE … CASCADE` 会连带删除依赖约束，后续 `DROP CONSTRAINT` 必然报「约束不存在」，
-- 故本文件按「先摘旧约束 → 再挂新约束 → 最后删旧表」手工定序；journal/snapshot 描述的是终态，不受影响）：
--   ① 11 条指向 `user_account` 的外键重指向官方 `user` 表（另 2 条随 identity_binding/local_credential 一并删除 ⇒ 合计 13 条）
--   ② 删除迁移完成的旧表：`user_account` / `identity_binding` / `local_credential`
--
-- 为什么 FK 重指向必须与切流同批（而不是留到清理批）：新账号由官方路径写入 `user`，
-- 若业务表仍引用 `user_account`，任何新用户的资产/审计写入都会被外键拒绝（单真值源的硬约束）。

ALTER TABLE "asset" DROP CONSTRAINT "asset_owner_id_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "asset" DROP CONSTRAINT "asset_created_by_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "asset" DROP CONSTRAINT "asset_updated_by_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "asset_version" DROP CONSTRAINT "asset_version_yanked_by_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "asset_version" DROP CONSTRAINT "asset_version_created_by_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "asset_label" DROP CONSTRAINT "asset_label_created_by_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_id_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "label_definition" DROP CONSTRAINT "label_definition_created_by_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "review_task" DROP CONSTRAINT "review_task_submitted_by_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "review_task" DROP CONSTRAINT "review_task_reviewed_by_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "api_token" DROP CONSTRAINT "api_token_user_id_user_account_id_fk";--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_version" ADD CONSTRAINT "asset_version_yanked_by_user_id_fk" FOREIGN KEY ("yanked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_version" ADD CONSTRAINT "asset_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_label" ADD CONSTRAINT "asset_label_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_definition" ADD CONSTRAINT "label_definition_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_task" ADD CONSTRAINT "review_task_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_task" ADD CONSTRAINT "review_task_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_binding" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "local_credential" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "identity_binding" CASCADE;--> statement-breakpoint
DROP TABLE "local_credential" CASCADE;--> statement-breakpoint
DROP TABLE "user_account" CASCADE;
