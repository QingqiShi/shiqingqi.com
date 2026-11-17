CREATE TABLE "trip_members" (
	"trip_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_members_trip_id_user_id_pk" PRIMARY KEY("trip_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- `trips_app` is the role that reads trips (`set local role trips_app` in the
-- reader's transaction). It can only select from the three trip tables, and
-- row-level security shows it only the rows of the user in `trips.user_id`.
-- The owner of the tables, which runs migrations, imports and sign-in, is not
-- limited.
CREATE ROLE "trips_app" NOLOGIN NOBYPASSRLS;--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('GRANT "trips_app" TO %I', current_user);
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA "public" TO "trips_app";--> statement-breakpoint
GRANT SELECT ON "trips", "trip_revisions", "trip_members" TO "trips_app";--> statement-breakpoint
-- An unset setting reads as NULL, or as '' on a pooled connection that had it
-- before. Both give NULL, which matches no row.
CREATE FUNCTION "public"."trips_viewer_id"() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(pg_catalog.current_setting('trips.user_id', true), '')::pg_catalog.uuid $$;--> statement-breakpoint
ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trip_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trip_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_membership" ON "trip_members" AS PERMISSIVE FOR SELECT TO "trips_app" USING ("user_id" = public.trips_viewer_id());--> statement-breakpoint
CREATE POLICY "member_trip" ON "trips" AS PERMISSIVE FOR SELECT TO "trips_app" USING (EXISTS (SELECT 1 FROM "trip_members" WHERE "trip_members"."trip_id" = "trips"."id" AND "trip_members"."user_id" = public.trips_viewer_id()));--> statement-breakpoint
CREATE POLICY "member_trip" ON "trip_revisions" AS PERMISSIVE FOR SELECT TO "trips_app" USING (EXISTS (SELECT 1 FROM "trip_members" WHERE "trip_members"."trip_id" = "trip_revisions"."trip_id" AND "trip_members"."user_id" = public.trips_viewer_id()));--> statement-breakpoint
-- One time: the trips that exist now were imported before trips had members.
-- They go to the account of the owner of the app, by its id in the production
-- database. A database that does not have this user gets no rows.
INSERT INTO "trip_members" ("trip_id", "user_id", "role")
SELECT "trips"."id", "users"."id", 'owner'
FROM "trips"
CROSS JOIN "users"
WHERE "users"."id" = 'a100be9d-b78a-48d8-b40c-eba132395cab';
