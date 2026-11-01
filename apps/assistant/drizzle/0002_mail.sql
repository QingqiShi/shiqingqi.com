CREATE TABLE "mail_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"address" text NOT NULL,
	"credential" "bytea" NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"last_error_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_accounts_address_key" UNIQUE("user_id","provider","address")
);
--> statement-breakpoint
CREATE TABLE "mail_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_categories_name_key" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "mail_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"path" text NOT NULL,
	"name" text NOT NULL,
	"delimiter" text,
	"special_use" text,
	"message_count" integer,
	"unseen_count" integer,
	"counted_at" timestamp with time zone,
	"category_id" uuid,
	"cursor_uid_validity" bigint,
	"cursor_last_uid" bigint,
	"cursor_baseline_uid" bigint,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_folders_path_key" UNIQUE("account_id","path")
);
--> statement-breakpoint
CREATE TABLE "mail_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"folder_id" uuid,
	"uid_validity" bigint NOT NULL,
	"uid" bigint NOT NULL,
	"message_id" text NOT NULL,
	"in_reply_to" text,
	"references" text[] DEFAULT '{}'::text[] NOT NULL,
	"from_address" text,
	"from_name" text,
	"reply_to" text,
	"to_addresses" text[] DEFAULT '{}'::text[] NOT NULL,
	"cc_addresses" text[] DEFAULT '{}'::text[] NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"sent_at" timestamp with time zone,
	"received_at" timestamp with time zone NOT NULL,
	"flags" text[] DEFAULT '{}'::text[] NOT NULL,
	"list_id" text,
	"list_unsubscribe" text,
	"auto_submitted" text,
	"precedence" text,
	"size" integer,
	"snippet" text DEFAULT '' NOT NULL,
	"origin" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_messages_message_id_key" UNIQUE("user_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD CONSTRAINT "mail_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_categories" ADD CONSTRAINT "mail_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_folders" ADD CONSTRAINT "mail_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_folders" ADD CONSTRAINT "mail_folders_account_id_mail_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."mail_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_folders" ADD CONSTRAINT "mail_folders_category_id_mail_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."mail_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_account_id_mail_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."mail_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_messages" ADD CONSTRAINT "mail_messages_folder_id_mail_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."mail_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_folders_category_key" ON "mail_folders" USING btree ("account_id","category_id") WHERE "mail_folders"."category_id" is not null;--> statement-breakpoint
CREATE INDEX "mail_folders_user_idx" ON "mail_folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mail_messages_received_idx" ON "mail_messages" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE INDEX "mail_messages_folder_uid_idx" ON "mail_messages" USING btree ("folder_id","uid");--> statement-breakpoint
CREATE INDEX "mail_messages_account_idx" ON "mail_messages" USING btree ("account_id");