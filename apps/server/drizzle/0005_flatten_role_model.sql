-- M4-pre S1/T1：角色模型扁平化（design §5）
-- 顺序至关重要：先加列 → 回填（必须读取旧绑定表）→ 再删旧表。
-- 手工调整自 drizzle-kit 生成稿（原稿把 DROP 放在 ADD 之前，无法回填）。
ALTER TABLE "user_account" ADD COLUMN "role" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "user_account" SET "role" = 100
  WHERE "id" IN (
    SELECT b.user_id FROM "user_role_binding" b
    JOIN "role" r ON r.id = b.role_id
    WHERE r.code = 'SUPER_ADMIN'
  );--> statement-breakpoint
UPDATE "user_account" SET "role" = 10
  WHERE "role" <> 100 AND "id" IN (
    SELECT b.user_id FROM "user_role_binding" b
    JOIN "role" r ON r.id = b.role_id
    WHERE r.code IN ('ASSET_ADMIN', 'USER_ADMIN', 'AUDITOR')
  );--> statement-breakpoint
ALTER TABLE "permission" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_permission" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_role_binding" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "permission" CASCADE;--> statement-breakpoint
DROP TABLE "role" CASCADE;--> statement-breakpoint
DROP TABLE "role_permission" CASCADE;--> statement-breakpoint
DROP TABLE "user_role_binding" CASCADE;--> statement-breakpoint
CREATE INDEX "idx_user_account_role" ON "user_account" USING btree ("role");
