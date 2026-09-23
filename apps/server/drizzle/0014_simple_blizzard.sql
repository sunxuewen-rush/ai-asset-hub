CREATE TABLE "download_event" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"asset_id" bigint NOT NULL,
	"version_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "download_event" ADD CONSTRAINT "download_event_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_event" ADD CONSTRAINT "download_event_version_id_asset_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."asset_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_download_event_created_at" ON "download_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_download_event_asset_id" ON "download_event" USING btree ("asset_id");