CREATE TABLE "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"trip_id" uuid,
	"kind" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"rounds" integer NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer NOT NULL,
	"cache_write_tokens" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- `trips_app` gets no grant on `ai_runs`, and no policy lets it see a row.
-- The function below is the only way for it to write a row.
ALTER TABLE "ai_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Writes the counts of one request of the viewer to a model. The row keeps
-- the trip only when the viewer is a member of it. Nothing for no viewer.
CREATE FUNCTION "public"."trips_log_ai_run"("trip" uuid, "kind" text, "model" text, "status" text, "rounds" integer, "input_tokens" integer, "output_tokens" integer, "cache_read_tokens" integer, "cache_write_tokens" integer, "duration_ms" integer) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ INSERT INTO "public"."ai_runs" ("user_id", "trip_id", "kind", "model", "status", "rounds", "input_tokens", "output_tokens", "cache_read_tokens", "cache_write_tokens", "duration_ms")
SELECT public.trips_viewer_id(), (SELECT "member"."trip_id" FROM "public"."trip_members" AS "member" WHERE "member"."trip_id" = "trips_log_ai_run"."trip" AND "member"."user_id" = public.trips_viewer_id()), "trips_log_ai_run"."kind", "trips_log_ai_run"."model", "trips_log_ai_run"."status", "trips_log_ai_run"."rounds", "trips_log_ai_run"."input_tokens", "trips_log_ai_run"."output_tokens", "trips_log_ai_run"."cache_read_tokens", "trips_log_ai_run"."cache_write_tokens", "trips_log_ai_run"."duration_ms"
WHERE public.trips_viewer_id() IS NOT NULL $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."trips_log_ai_run"(uuid, text, text, text, integer, integer, integer, integer, integer, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."trips_log_ai_run"(uuid, text, text, text, integer, integer, integer, integer, integer, integer) TO "trips_app";