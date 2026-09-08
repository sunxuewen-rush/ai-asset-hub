ALTER TABLE "asset_version" ADD COLUMN "yanked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "asset_version" ADD COLUMN "yanked_by" varchar(128);--> statement-breakpoint
ALTER TABLE "asset_version" ADD COLUMN "yank_reason" text;--> statement-breakpoint
ALTER TABLE "asset_version" ADD COLUMN "bundle_storage_key" varchar(512);--> statement-breakpoint
ALTER TABLE "asset_version" ADD COLUMN "bundle_sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "asset_version" ADD CONSTRAINT "asset_version_yanked_by_user_account_id_fk" FOREIGN KEY ("yanked_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;