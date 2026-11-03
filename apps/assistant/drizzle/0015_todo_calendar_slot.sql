ALTER TABLE "todos" ADD COLUMN "calendar_account_id" uuid;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "calendar_url" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "calendar_href" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "calendar_etag" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "calendar_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "calendar_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_calendar_account_id_mail_accounts_id_fk" FOREIGN KEY ("calendar_account_id") REFERENCES "public"."mail_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todos_calendar_over_idx" ON "todos" USING btree ("user_id","calendar_start") WHERE "todos"."calendar_account_id" is not null and ("todos"."done_at" is not null or "todos"."deleted_at" is not null);--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_calendar_slot_whole" CHECK (("todos"."calendar_href" is null) = ("todos"."calendar_url" is null) and ("todos"."calendar_href" is null) = ("todos"."calendar_start" is null) and ("todos"."calendar_href" is null) = ("todos"."calendar_end" is null) and ("todos"."calendar_href" is not null or "todos"."calendar_account_id" is null));