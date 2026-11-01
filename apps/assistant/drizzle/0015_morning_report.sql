CREATE TABLE "morning_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"content" jsonb NOT NULL,
	"model_id" text,
	"built_at" timestamp with time zone NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "morning_reports_date_key" UNIQUE("user_id","local_date")
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"detail" text,
	"due_date" date,
	"source_account_id" uuid,
	"source_message_id" text,
	"created_report_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "morning_reports" ADD CONSTRAINT "morning_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_source_account_id_mail_accounts_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "public"."mail_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_created_report_id_morning_reports_id_fk" FOREIGN KEY ("created_report_id") REFERENCES "public"."morning_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todos_open_idx" ON "todos" USING btree ("user_id","created_at") WHERE "todos"."done_at" is null;--> statement-breakpoint
CREATE INDEX "todos_report_idx" ON "todos" USING btree ("created_report_id");