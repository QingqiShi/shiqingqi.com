ALTER TABLE "todos" ADD COLUMN "remind_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "snoozed_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "reminded_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "todos_reminder_idx" ON "todos" USING btree ("user_id") WHERE "todos"."remind_at" is not null and "todos"."reminded_at" is null and "todos"."done_at" is null and "todos"."deleted_at" is null;