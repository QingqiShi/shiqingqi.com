CREATE TABLE "morning_report_previews" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"local_date" date NOT NULL,
	"content" jsonb,
	"todo_changes" jsonb,
	"error" text,
	"started_at" timestamp with time zone NOT NULL,
	"built_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "morning_report_previews" ADD CONSTRAINT "morning_report_previews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;