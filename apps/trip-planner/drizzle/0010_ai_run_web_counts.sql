ALTER TABLE "ai_runs" ADD COLUMN "web_searches" integer;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD COLUMN "web_fetches" integer;--> statement-breakpoint
-- The same as the function of 0007, with the web searches and fetches of a
-- research run. The function of 0007 stays, because a deployment that is
-- older than this migration still calls it.
CREATE FUNCTION "public"."trips_log_ai_run"("trip" uuid, "kind" text, "model" text, "status" text, "rounds" integer, "input_tokens" integer, "output_tokens" integer, "cache_read_tokens" integer, "cache_write_tokens" integer, "duration_ms" integer, "web_searches" integer, "web_fetches" integer) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ INSERT INTO "public"."ai_runs" ("user_id", "trip_id", "kind", "model", "status", "rounds", "input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens", "duration_ms", "web_searches", "web_fetches")
SELECT public.trips_viewer_id(), (SELECT "member"."trip_id" FROM "public"."trip_members" AS "member" WHERE "member"."trip_id" = "trips_log_ai_run"."trip" AND "member"."user_id" = public.trips_viewer_id()), "trips_log_ai_run"."kind", "trips_log_ai_run"."model", "trips_log_ai_run"."status", "trips_log_ai_run"."rounds", "trips_log_ai_run"."input_tokens", "trips_log_ai_run"."output_tokens", "trips_log_ai_run"."cache_read_tokens", "trips_log_ai_run"."cache_write_tokens", "trips_log_ai_run"."duration_ms", "trips_log_ai_run"."web_searches", "trips_log_ai_run"."web_fetches"
WHERE public.trips_viewer_id() IS NOT NULL $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."trips_log_ai_run"(uuid, text, text, text, integer, integer, integer, integer, integer, integer, integer, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."trips_log_ai_run"(uuid, text, text, text, integer, integer, integer, integer, integer, integer, integer, integer) TO "trips_app";
