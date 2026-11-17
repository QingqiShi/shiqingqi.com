ALTER TABLE "trips" DROP CONSTRAINT "trips_slug_unique";--> statement-breakpoint
ALTER TABLE "trip_revisions" ADD COLUMN "author_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_revisions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_revisions" ADD CONSTRAINT "trip_revisions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" DROP COLUMN "slug";--> statement-breakpoint
UPDATE "trip_revisions" SET "updated_at" = "created_at";--> statement-breakpoint
-- The path of a trip is its id since `0005_trip_url_by_id.sql`.
DROP FUNCTION "public"."trips_accept_invite"(text);--> statement-breakpoint
-- `trips_app` gets no grant to write `trips`, `trip_revisions` or
-- `trip_members`. The three functions below are the only way for it to make,
-- change or delete a trip. They run as the owner of the tables, which
-- row-level security does not limit, so each one makes its own check of the
-- viewer.
--
-- Makes a trip of the viewer: the trip, revision 1 with the document, and
-- the viewer as its owner. NULL for no viewer.
CREATE FUNCTION "public"."trips_create"("document" jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_trip uuid;
BEGIN
  IF the_viewer IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO "public"."trips" DEFAULT VALUES RETURNING "id" INTO the_trip;
  INSERT INTO "public"."trip_revisions" ("trip_id", "revision", "document", "author_id")
  VALUES (the_trip, 1, "trips_create"."document", the_viewer);
  INSERT INTO "public"."trip_members" ("trip_id", "user_id", "role")
  VALUES (the_trip, the_viewer, 'owner');
  RETURN the_trip;
END
$$;--> statement-breakpoint
-- Saves a new document of a trip that the viewer is an owner or an editor
-- of, and gives the number of the revision that holds it. NULL when the
-- viewer cannot change the trip.
--
-- The caller gives the number and the `updated_at` of the newest revision
-- that it read. The lock on the row of the trip makes two saves of one trip
-- run one after the other. When the newest revision is not the one that the
-- caller read, another save came first, and the function raises 40001: the
-- caller reads the trip again and applies its change again.
--
-- A save by the author of the newest revision, less than 10 minutes after
-- that revision was made, goes into it. Any other save makes a new revision,
-- and the revisions of the trip before its newest 100 go.
CREATE FUNCTION "public"."trips_save"("trip" uuid, "read_revision" integer, "read_updated_at" timestamp with time zone, "document" jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  newest record;
BEGIN
  IF the_viewer IS NULL OR NOT EXISTS (
    SELECT 1 FROM "public"."trip_members" AS "member"
    WHERE "member"."trip_id" = "trips_save"."trip" AND "member"."user_id" = the_viewer AND "member"."role" IN ('owner', 'editor')
  ) THEN
    RETURN NULL;
  END IF;
  PERFORM 1 FROM "public"."trips" AS "row" WHERE "row"."id" = "trips_save"."trip" FOR UPDATE;
  SELECT "revision"."id", "revision"."revision", "revision"."author_id", "revision"."created_at", "revision"."updated_at" INTO newest
  FROM "public"."trip_revisions" AS "revision"
  WHERE "revision"."trip_id" = "trips_save"."trip"
  ORDER BY "revision"."revision" DESC
  LIMIT 1;
  IF newest.revision IS DISTINCT FROM "trips_save"."read_revision" OR newest.updated_at IS DISTINCT FROM "trips_save"."read_updated_at" THEN
    RAISE EXCEPTION 'The trip changed after it was read.' USING ERRCODE = 'serialization_failure';
  END IF;
  IF newest.author_id = the_viewer AND newest.created_at > pg_catalog.clock_timestamp() - interval '10 minutes' THEN
    UPDATE "public"."trip_revisions" AS "revision"
    SET "document" = "trips_save"."document", "updated_at" = pg_catalog.clock_timestamp()
    WHERE "revision"."id" = newest.id;
    RETURN newest.revision;
  END IF;
  INSERT INTO "public"."trip_revisions" ("trip_id", "revision", "document", "author_id", "created_at", "updated_at")
  VALUES ("trips_save"."trip", newest.revision + 1, "trips_save"."document", the_viewer, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp());
  DELETE FROM "public"."trip_revisions" AS "revision"
  WHERE "revision"."trip_id" = "trips_save"."trip" AND "revision"."revision" <= newest.revision + 1 - 100;
  RETURN newest.revision + 1;
END
$$;--> statement-breakpoint
-- Deletes a trip that the viewer owns, with its revisions, members and
-- invites. False for any other trip.
CREATE FUNCTION "public"."trips_delete"("trip" uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ WITH "gone" AS (DELETE FROM "public"."trips" AS "row" WHERE "row"."id" = "trips_delete"."trip" AND EXISTS (SELECT 1 FROM "public"."trip_members" AS "member" WHERE "member"."trip_id" = "trips_delete"."trip" AND "member"."user_id" = public.trips_viewer_id() AND "member"."role" = 'owner') RETURNING 1) SELECT EXISTS (SELECT 1 FROM "gone") $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."trips_create"(jsonb), "public"."trips_save"(uuid, integer, timestamp with time zone, jsonb), "public"."trips_delete"(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."trips_create"(jsonb), "public"."trips_save"(uuid, integer, timestamp with time zone, jsonb), "public"."trips_delete"(uuid) TO "trips_app";
