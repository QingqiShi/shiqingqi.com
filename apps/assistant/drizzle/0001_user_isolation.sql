-- `assistant_app` is the role the app runs as inside every transaction
-- (`set local role assistant_app`): it may read and write the tables, and row
-- level security limits it to the user in `app.user_id`. The role that runs
-- the migrations (the owner) must be a member of it to set role to it.
CREATE ROLE "assistant_app" NOLOGIN NOBYPASSRLS;--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('GRANT "assistant_app" TO %I', current_user);
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA "public" TO "assistant_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "assistant_app";--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "assistant_app";--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT USAGE, SELECT ON SEQUENCES TO "assistant_app";--> statement-breakpoint
-- No SET clause: Postgres inlines the function into each policy, so a scan
-- reads the setting once, not once per row.
CREATE FUNCTION "public"."current_user_id"() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(pg_catalog.current_setting('app.user_id', true), '')::pg_catalog.uuid $$;--> statement-breakpoint
-- Limits every statement on `target` to the rows whose `key` is the user in
-- `app.user_id`, for every role (FORCE: the owner too). Call it in the
-- migration of each new user table.
CREATE FUNCTION "public"."isolate_user_table"(target regclass, key name DEFAULT 'user_id') RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
  EXECUTE format(
    'CREATE POLICY "user_isolation" ON %s AS PERMISSIVE FOR ALL TO PUBLIC USING (%I = public.current_user_id()) WITH CHECK (%I = public.current_user_id())',
    target, key, key
  );
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."isolate_user_table"(regclass, name) FROM PUBLIC;--> statement-breakpoint
SELECT "public"."isolate_user_table"('"user_settings"');
