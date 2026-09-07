CREATE TABLE "api_token" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"scope" text,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_api_token_token_hash" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "identity_binding" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"provider" varchar(64) NOT NULL,
	"provider_subject" varchar(256) NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_identity_binding_provider_subject" UNIQUE("provider","provider_subject")
);
--> statement-breakpoint
CREATE TABLE "local_credential" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_local_credential_username" UNIQUE("username"),
	CONSTRAINT "uq_local_credential_user_id" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "permission" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(128) NOT NULL,
	"name" varchar(128) NOT NULL,
	"group_code" varchar(64),
	CONSTRAINT "uq_permission_code" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" varchar(512),
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_role_code" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
	"role_id" bigserial NOT NULL,
	"permission_id" bigserial NOT NULL,
	CONSTRAINT "role_permission_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user_account" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"email" varchar(256),
	"avatar_url" varchar(512),
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role_binding" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"role_id" bigserial NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_user_role_binding_user_role" UNIQUE("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "namespace" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"avatar_url" varchar(512),
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_namespace_slug" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "namespace_member" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"namespace_id" bigserial NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_namespace_member" UNIQUE("namespace_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "asset" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"namespace_id" bigserial NOT NULL,
	"type" text NOT NULL,
	"slug" varchar(64) NOT NULL,
	"owner_id" varchar(128) NOT NULL,
	"latest_version_id" bigserial NOT NULL,
	"visibility" text DEFAULT 'PUBLIC' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"download_count" bigint DEFAULT 0 NOT NULL,
	"created_by" varchar(128),
	"updated_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_asset_namespace_slug" UNIQUE("namespace_id","slug")
);
--> statement-breakpoint
CREATE TABLE "asset_file" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"version_id" bigserial NOT NULL,
	"file_path" varchar(512) NOT NULL,
	"file_size" bigint NOT NULL,
	"content_type" varchar(128),
	"sha256" varchar(64) NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_asset_file_version_path" UNIQUE("version_id","file_path")
);
--> statement-breakpoint
CREATE TABLE "asset_version" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"asset_id" bigserial NOT NULL,
	"version" varchar(64) NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"changelog" text,
	"parsed_metadata_json" jsonb,
	"manifest_json" jsonb,
	"file_count" integer DEFAULT 0 NOT NULL,
	"total_size" bigint DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_asset_version_asset_version" UNIQUE("asset_id","version")
);
--> statement-breakpoint
CREATE TABLE "asset_label" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"asset_id" bigserial NOT NULL,
	"label_id" bigserial NOT NULL,
	"created_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_asset_label" UNIQUE("asset_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" varchar(128),
	"action" varchar(64) NOT NULL,
	"target_type" varchar(64),
	"target_id" varchar(128),
	"request_id" varchar(64),
	"client_ip" varchar(64),
	"user_agent" varchar(512),
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_definition" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"type" text NOT NULL,
	"visible_in_filter" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"parent_id" bigserial NOT NULL,
	"created_by" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_label_definition_slug" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "label_translation" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"label_id" bigserial NOT NULL,
	"locale" varchar(16) NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_label_translation_label_locale" UNIQUE("label_id","locale")
);
--> statement-breakpoint
CREATE TABLE "review_task" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"asset_version_id" bigserial NOT NULL,
	"namespace_id" bigserial NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"submitted_by" varchar(128) NOT NULL,
	"reviewed_by" varchar(128),
	"review_comment" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_binding" ADD CONSTRAINT "identity_binding_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_credential" ADD CONSTRAINT "local_credential_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_binding" ADD CONSTRAINT "user_role_binding_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_binding" ADD CONSTRAINT "user_role_binding_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "namespace" ADD CONSTRAINT "namespace_created_by_user_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "namespace_member" ADD CONSTRAINT "namespace_member_namespace_id_namespace_id_fk" FOREIGN KEY ("namespace_id") REFERENCES "public"."namespace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "namespace_member" ADD CONSTRAINT "namespace_member_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_namespace_id_namespace_id_fk" FOREIGN KEY ("namespace_id") REFERENCES "public"."namespace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_owner_id_user_account_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_created_by_user_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_updated_by_user_account_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_file" ADD CONSTRAINT "asset_file_version_id_asset_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."asset_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_version" ADD CONSTRAINT "asset_version_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_version" ADD CONSTRAINT "asset_version_created_by_user_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_label" ADD CONSTRAINT "asset_label_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_label" ADD CONSTRAINT "asset_label_label_id_label_definition_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label_definition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_label" ADD CONSTRAINT "asset_label_created_by_user_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_account_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_definition" ADD CONSTRAINT "label_definition_parent_id_label_definition_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."label_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_definition" ADD CONSTRAINT "label_definition_created_by_user_account_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_translation" ADD CONSTRAINT "label_translation_label_id_label_definition_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."label_definition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_task" ADD CONSTRAINT "review_task_asset_version_id_asset_version_id_fk" FOREIGN KEY ("asset_version_id") REFERENCES "public"."asset_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_task" ADD CONSTRAINT "review_task_namespace_id_namespace_id_fk" FOREIGN KEY ("namespace_id") REFERENCES "public"."namespace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_task" ADD CONSTRAINT "review_task_submitted_by_user_account_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_task" ADD CONSTRAINT "review_task_reviewed_by_user_account_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_token_user_id" ON "api_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_identity_binding_user_id" ON "identity_binding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_account_email" ON "user_account" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_account_status" ON "user_account" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_role_binding_user_id" ON "user_role_binding" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_namespace_member_user_id" ON "namespace_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_namespace_member_namespace_id" ON "namespace_member" USING btree ("namespace_id");--> statement-breakpoint
CREATE INDEX "idx_asset_namespace_status" ON "asset" USING btree ("namespace_id","status");--> statement-breakpoint
CREATE INDEX "idx_asset_version_asset_status" ON "asset_version" USING btree ("asset_id","status");--> statement-breakpoint
CREATE INDEX "idx_asset_label_label_id" ON "asset_label" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor_id" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_log_target" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_review_task_version_pending" ON "review_task" USING btree ("asset_version_id") WHERE status = 'PENDING';--> statement-breakpoint
CREATE INDEX "idx_review_task_namespace_status" ON "review_task" USING btree ("namespace_id","status");--> statement-breakpoint
CREATE INDEX "idx_review_task_submitted_by_status" ON "review_task" USING btree ("submitted_by","status");