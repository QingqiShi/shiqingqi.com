CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"uid" text NOT NULL,
	"url" text NOT NULL,
	"thread_ids" text[] NOT NULL,
	"event" jsonb NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_uid_key" UNIQUE("user_id","uid")
);
--> statement-breakpoint
CREATE TABLE "calendar_writes" (
	"classification_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"result" text,
	"event_id" uuid,
	"failures" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"written_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "calendar_url" text;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "calendar_error_code" text;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "calendar_error_message" text;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "calendar_error_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "calendar_events" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "calendar_events_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_account_id_mail_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."mail_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_writes" ADD CONSTRAINT "calendar_writes_classification_id_mail_classifications_id_fk" FOREIGN KEY ("classification_id") REFERENCES "public"."mail_classifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_writes" ADD CONSTRAINT "calendar_writes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_writes" ADD CONSTRAINT "calendar_writes_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_thread_idx" ON "calendar_events" USING gin ("thread_ids");