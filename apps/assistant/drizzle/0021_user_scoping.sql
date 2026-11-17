-- `assistant_app` is the role that the app takes for each statement and
-- transaction of a user (`set_config('role', 'assistant_app', true)`, see
-- `src/assistant/db/scope-to.ts`). Row-level security gives it only the
-- rows of the user in `assistant.user_id`. It has no right on the tables of
-- sign-in. The owner of the tables, which runs migrations and sign-in, is not
-- limited: there is no FORCE.
CREATE ROLE "assistant_app" NOLOGIN NOBYPASSRLS;--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('GRANT "assistant_app" TO %I', current_user);
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA "public" TO "assistant_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_settings", "mail_accounts", "morning_reports", "morning_report_previews", "todos", "todo_checklist_items", "capture_tokens", "push_subscriptions", "agent_runs", "agent_actions" TO "assistant_app";--> statement-breakpoint
GRANT SELECT ON "users" TO "assistant_app";--> statement-breakpoint
-- An unset setting reads as NULL, or as '' on a pooled connection that had it
-- before. Both give NULL, which matches no row.
CREATE FUNCTION "public"."assistant_user_id"() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(pg_catalog.current_setting('assistant.user_id', true), '')::pg_catalog.uuid $$;--> statement-breakpoint
-- A foreign key check does not see row-level security. These tell a policy
-- that a row a user writes points only at rows of the same user. They have
-- their own query, so a policy on `todos` can name `todos`.
CREATE FUNCTION "public"."assistant_owns_mail_account"("account" uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM "public"."mail_accounts" AS "row" WHERE "row"."id" = "assistant_owns_mail_account"."account" AND "row"."user_id" = public.assistant_user_id()) $$;--> statement-breakpoint
CREATE FUNCTION "public"."assistant_owns_report"("report" uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM "public"."morning_reports" AS "row" WHERE "row"."id" = "assistant_owns_report"."report" AND "row"."user_id" = public.assistant_user_id()) $$;--> statement-breakpoint
CREATE FUNCTION "public"."assistant_owns_todo"("todo" uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM "public"."todos" AS "row" WHERE "row"."id" = "assistant_owns_todo"."todo" AND "row"."user_id" = public.assistant_user_id()) $$;--> statement-breakpoint
CREATE FUNCTION "public"."assistant_owns_run"("run" uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM "public"."agent_runs" AS "row" WHERE "row"."id" = "assistant_owns_run"."run" AND "row"."user_id" = public.assistant_user_id()) $$;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mail_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "morning_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "morning_report_previews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "todos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "todo_checklist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "capture_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_actions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_user" ON "users" AS PERMISSIVE FOR SELECT TO "assistant_app" USING ("id" = public.assistant_user_id());--> statement-breakpoint
CREATE POLICY "own_rows" ON "user_settings" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id());--> statement-breakpoint
CREATE POLICY "own_rows" ON "mail_accounts" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id());--> statement-breakpoint
CREATE POLICY "own_rows" ON "morning_reports" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id());--> statement-breakpoint
CREATE POLICY "own_rows" ON "morning_report_previews" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id());--> statement-breakpoint
CREATE POLICY "own_rows" ON "todos" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id() AND ("calendar_account_id" IS NULL OR public.assistant_owns_mail_account("calendar_account_id")) AND ("source_account_id" IS NULL OR public.assistant_owns_mail_account("source_account_id")) AND ("created_report_id" IS NULL OR public.assistant_owns_report("created_report_id")) AND ("re_adds_todo_id" IS NULL OR public.assistant_owns_todo("re_adds_todo_id")));--> statement-breakpoint
CREATE POLICY "own_rows" ON "todo_checklist_items" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id() AND public.assistant_owns_todo("todo_id"));--> statement-breakpoint
CREATE POLICY "own_rows" ON "capture_tokens" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id());--> statement-breakpoint
CREATE POLICY "own_rows" ON "push_subscriptions" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id());--> statement-breakpoint
CREATE POLICY "own_rows" ON "agent_runs" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id());--> statement-breakpoint
CREATE POLICY "own_rows" ON "agent_actions" AS PERMISSIVE FOR ALL TO "assistant_app" USING ("user_id" = public.assistant_user_id()) WITH CHECK ("user_id" = public.assistant_user_id() AND public.assistant_owns_run("run_id") AND ("account_id" IS NULL OR public.assistant_owns_mail_account("account_id")));--> statement-breakpoint
-- The three steps that cross users run as the owner of the tables. The first
-- two answer only `assistant_app` with no user set, so a request of one user
-- cannot use them.
-- Every user, oldest first, for a cron that does the work of each user as
-- that user.
CREATE FUNCTION "public"."assistant_user_ids"() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT "person"."id" FROM "public"."users" AS "person" WHERE public.assistant_user_id() IS NULL ORDER BY "person"."created_at", "person"."id" $$;--> statement-breakpoint
-- The user, the hash of the secret and the start of the rate limit window
-- of a capture token, found by the id in the token. The app compares the
-- secret, then counts the use as that user.
CREATE FUNCTION "public"."assistant_capture_token"("token" uuid) RETURNS TABLE ("user_id" uuid, "token_hash" bytea, "window_started_at" timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT "row"."user_id", "row"."token_hash", "row"."window_started_at" FROM "public"."capture_tokens" AS "row" WHERE "row"."id" = "assistant_capture_token"."token" AND public.assistant_user_id() IS NULL $$;--> statement-breakpoint
-- A push endpoint is one browser. When a user subscribes it, the rows of
-- other users with the same endpoint go, so that a browser that another user
-- signed in on before does not get that user's headlines. Only a user can
-- call it, and only the holder of the browser knows its endpoint. The lock
-- holds until the caller's transaction ends, so two users who subscribe the
-- same browser at the same time do not both keep it.
CREATE FUNCTION "public"."assistant_take_push_endpoint"("endpoint" text) RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$ SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assistant_push_endpoint:' || "assistant_take_push_endpoint"."endpoint", 0)); DELETE FROM "public"."push_subscriptions" AS "row" WHERE "row"."endpoint" = "assistant_take_push_endpoint"."endpoint" AND "row"."user_id" <> public.assistant_user_id() $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."assistant_owns_mail_account"(uuid), "public"."assistant_owns_report"(uuid), "public"."assistant_owns_todo"(uuid), "public"."assistant_owns_run"(uuid), "public"."assistant_user_ids"(), "public"."assistant_capture_token"(uuid), "public"."assistant_take_push_endpoint"(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."assistant_owns_mail_account"(uuid), "public"."assistant_owns_report"(uuid), "public"."assistant_owns_todo"(uuid), "public"."assistant_owns_run"(uuid), "public"."assistant_user_ids"(), "public"."assistant_capture_token"(uuid), "public"."assistant_take_push_endpoint"(text) TO "assistant_app";
