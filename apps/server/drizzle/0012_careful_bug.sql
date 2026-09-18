CREATE TABLE "asset_star" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"asset_id" bigint NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_asset_star_asset_user" UNIQUE("asset_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "asset" ADD COLUMN "star_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_star" ADD CONSTRAINT "asset_star_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_star" ADD CONSTRAINT "asset_star_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;