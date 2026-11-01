CREATE TABLE "mail_history_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"anthropic_batch_id" text,
	"model_id" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"category_names" text[] NOT NULL,
	"request_count" integer NOT NULL,
	"submitted_at" timestamp with time zone,
	"stored_at" timestamp with time zone,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_read_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_write_tokens" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_history_batches_anthropic_batch_id_unique" UNIQUE("anthropic_batch_id")
);
--> statement-breakpoint
CREATE TABLE "mail_history_jobs" (
	"message_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"batch_id" uuid,
	"failures" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_sent_recipients" (
	"user_id" uuid NOT NULL,
	"address" text NOT NULL,
	"last_sent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_sent_recipients_user_id_address_pk" PRIMARY KEY("user_id","address")
);
--> statement-breakpoint
ALTER TABLE "mail_folders" ADD COLUMN "history_uid_validity" bigint;--> statement-breakpoint
ALTER TABLE "mail_folders" ADD COLUMN "history_next_uid" bigint;--> statement-breakpoint
ALTER TABLE "mail_folders" ADD COLUMN "history_done_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "history_import" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_history_batches" ADD CONSTRAINT "mail_history_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_history_jobs" ADD CONSTRAINT "mail_history_jobs_message_id_mail_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."mail_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_history_jobs" ADD CONSTRAINT "mail_history_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_history_jobs" ADD CONSTRAINT "mail_history_jobs_batch_id_mail_history_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."mail_history_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_sent_recipients" ADD CONSTRAINT "mail_sent_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_history_batches_open_idx" ON "mail_history_batches" USING btree ("user_id") WHERE "mail_history_batches"."stored_at" is null;--> statement-breakpoint
CREATE INDEX "mail_history_jobs_queue_idx" ON "mail_history_jobs" USING btree ("user_id","batch_id");--> statement-breakpoint
CREATE INDEX "mail_history_jobs_batch_idx" ON "mail_history_jobs" USING btree ("batch_id");