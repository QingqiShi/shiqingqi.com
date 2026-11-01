DROP TABLE "calendar_events" CASCADE;--> statement-breakpoint
DROP TABLE "calendar_writes" CASCADE;--> statement-breakpoint
DROP TABLE "invites" CASCADE;--> statement-breakpoint
DROP TABLE "mail_categories" CASCADE;--> statement-breakpoint
DROP TABLE "mail_classifications" CASCADE;--> statement-breakpoint
DROP TABLE "mail_corrections" CASCADE;--> statement-breakpoint
DROP TABLE "mail_digests" CASCADE;--> statement-breakpoint
DROP TABLE "mail_folders" CASCADE;--> statement-breakpoint
DROP TABLE "mail_history_batches" CASCADE;--> statement-breakpoint
DROP TABLE "mail_history_jobs" CASCADE;--> statement-breakpoint
DROP TABLE "mail_messages" CASCADE;--> statement-breakpoint
DROP TABLE "mail_sender_rules" CASCADE;--> statement-breakpoint
DROP TABLE "mail_sent_recipients" CASCADE;--> statement-breakpoint
DROP TABLE "mail_write_states" CASCADE;--> statement-breakpoint
ALTER TABLE "mail_accounts" DROP COLUMN "calendar_url";--> statement-breakpoint
ALTER TABLE "mail_accounts" DROP COLUMN "calendar_error_code";--> statement-breakpoint
ALTER TABLE "mail_accounts" DROP COLUMN "calendar_error_message";--> statement-breakpoint
ALTER TABLE "mail_accounts" DROP COLUMN "calendar_error_at";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "mailbox_writes";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "mailbox_writes_since";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "calendar_events";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "calendar_events_since";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "history_import";--> statement-breakpoint
DROP POLICY "user_isolation" ON "user_settings";--> statement-breakpoint
ALTER TABLE "user_settings" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "user_isolation" ON "mail_accounts";--> statement-breakpoint
ALTER TABLE "mail_accounts" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mail_accounts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "user_isolation" ON "push_subscriptions";--> statement-breakpoint
ALTER TABLE "push_subscriptions" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "push_subscriptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "user_isolation" ON "morning_reports";--> statement-breakpoint
ALTER TABLE "morning_reports" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "morning_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "user_isolation" ON "todos";--> statement-breakpoint
ALTER TABLE "todos" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "todos" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP FUNCTION "public"."isolate_user_table"(regclass, name);--> statement-breakpoint
DROP FUNCTION "public"."current_user_id"();--> statement-breakpoint
DROP OWNED BY "assistant_app";--> statement-breakpoint
DROP ROLE "assistant_app";
