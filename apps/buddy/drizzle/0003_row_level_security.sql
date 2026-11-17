-- Two roles that the app takes for one transaction (`set local role`).
-- `buddy_app` is the signed-in user: row-level security shows it only the
-- rows of the account in `buddy.user_id`. `buddy_archive` is the daily cron:
-- it reads every account and Mac, but only the columns that the archive
-- needs, and it writes only the visitor counts and the usage days.
-- The owner of the tables, which runs migrations and sign-in, is not limited.
CREATE ROLE "buddy_app" NOLOGIN NOBYPASSRLS;--> statement-breakpoint
CREATE ROLE "buddy_archive" NOLOGIN NOBYPASSRLS;--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('GRANT "buddy_app", "buddy_archive" TO %I', current_user);
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA "public" TO "buddy_app", "buddy_archive";--> statement-breakpoint
-- An unset setting reads as NULL, or as '' on a pooled connection that had it
-- before. Both give NULL, which matches no row.
CREATE FUNCTION "public"."buddy_viewer_id"() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(pg_catalog.current_setting('buddy.user_id', true), '')::pg_catalog.uuid $$;--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "machines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buddy_usage_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Only sign-in reads the tables of sign-in. Neither role has a grant on them.
ALTER TABLE "passkeys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recoveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sign_ups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT ("id", "name", "is_public"), UPDATE ("is_public") ON "accounts" TO "buddy_app";--> statement-breakpoint
CREATE POLICY "viewer_reads" ON "accounts" AS PERMISSIVE FOR SELECT TO "buddy_app" USING ("id" = public.buddy_viewer_id());--> statement-breakpoint
CREATE POLICY "viewer_changes" ON "accounts" AS PERMISSIVE FOR UPDATE TO "buddy_app" USING ("id" = public.buddy_viewer_id()) WITH CHECK ("id" = public.buddy_viewer_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ("name", "revoked_at") ON "machines" TO "buddy_app";--> statement-breakpoint
CREATE POLICY "viewer_reads" ON "machines" AS PERMISSIVE FOR SELECT TO "buddy_app" USING ("user_id" = public.buddy_viewer_id());--> statement-breakpoint
CREATE POLICY "viewer_connects" ON "machines" AS PERMISSIVE FOR INSERT TO "buddy_app" WITH CHECK ("user_id" = public.buddy_viewer_id());--> statement-breakpoint
CREATE POLICY "viewer_changes" ON "machines" AS PERMISSIVE FOR UPDATE TO "buddy_app" USING ("user_id" = public.buddy_viewer_id()) WITH CHECK ("user_id" = public.buddy_viewer_id());--> statement-breakpoint
GRANT SELECT ("id", "name", "is_public", "visitor_fed", "visitor_patted"), UPDATE ("visitor_fed", "visitor_patted") ON "accounts" TO "buddy_archive";--> statement-breakpoint
CREATE POLICY "archive_reads" ON "accounts" AS PERMISSIVE FOR SELECT TO "buddy_archive" USING (true);--> statement-breakpoint
CREATE POLICY "archive_counts" ON "accounts" AS PERMISSIVE FOR UPDATE TO "buddy_archive" USING (true) WITH CHECK (true);--> statement-breakpoint
GRANT SELECT ("machine_id", "user_id", "public_key", "revoked_at") ON "machines" TO "buddy_archive";--> statement-breakpoint
CREATE POLICY "archive_reads" ON "machines" AS PERMISSIVE FOR SELECT TO "buddy_archive" USING (true);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ("tokens", "cost_usd", "cache_read", "prompt_tokens", "archived_at") ON "buddy_usage_days" TO "buddy_archive";--> statement-breakpoint
CREATE POLICY "archive_reads" ON "buddy_usage_days" AS PERMISSIVE FOR SELECT TO "buddy_archive" USING (true);--> statement-breakpoint
-- A day is written under the account of the Mac that counted it.
CREATE POLICY "archive_writes" ON "buddy_usage_days" AS PERMISSIVE FOR INSERT TO "buddy_archive" WITH CHECK (EXISTS (SELECT 1 FROM "machines" WHERE "machines"."machine_id" = "buddy_usage_days"."machine_id" AND "machines"."user_id"::text = "buddy_usage_days"."user_id"));--> statement-breakpoint
CREATE POLICY "archive_raises" ON "buddy_usage_days" AS PERMISSIVE FOR UPDATE TO "buddy_archive" USING (true) WITH CHECK (EXISTS (SELECT 1 FROM "machines" WHERE "machines"."machine_id" = "buddy_usage_days"."machine_id" AND "machines"."user_id"::text = "buddy_usage_days"."user_id"));
