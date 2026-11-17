-- Puts the document of an older revision of a trip back, as a new revision
-- that the viewer is the author of, and gives its number. NULL when the
-- viewer cannot change the trip.
--
-- The guard is the one of `trips_save`: the caller gives the number and the
-- `updated_at` of the newest revision that the person saw, and the function
-- raises 40001 when the trip changed after that, or when the older revision
-- is gone. Unlike `trips_save`, a restore never goes into the newest
-- revision, so the version that it replaces stays in the history, and a
-- restore can itself be taken back.
CREATE FUNCTION "public"."trips_restore"("trip" uuid, "read_revision" integer, "read_updated_at" timestamp with time zone, "from_revision" integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  newest record;
  the_document jsonb;
BEGIN
  IF the_viewer IS NULL OR NOT EXISTS (
    SELECT 1 FROM "public"."trip_members" AS "member"
    WHERE "member"."trip_id" = "trips_restore"."trip" AND "member"."user_id" = the_viewer AND "member"."role" IN ('owner', 'editor')
  ) THEN
    RETURN NULL;
  END IF;
  PERFORM 1 FROM "public"."trips" AS "row" WHERE "row"."id" = "trips_restore"."trip" FOR UPDATE;
  SELECT "revision"."revision", "revision"."updated_at" INTO newest
  FROM "public"."trip_revisions" AS "revision"
  WHERE "revision"."trip_id" = "trips_restore"."trip"
  ORDER BY "revision"."revision" DESC
  LIMIT 1;
  SELECT "revision"."document" INTO the_document
  FROM "public"."trip_revisions" AS "revision"
  WHERE "revision"."trip_id" = "trips_restore"."trip" AND "revision"."revision" = "trips_restore"."from_revision";
  IF newest.revision IS DISTINCT FROM "trips_restore"."read_revision" OR newest.updated_at IS DISTINCT FROM "trips_restore"."read_updated_at" OR the_document IS NULL THEN
    RAISE EXCEPTION 'The trip changed after it was read.' USING ERRCODE = 'serialization_failure';
  END IF;
  INSERT INTO "public"."trip_revisions" ("trip_id", "revision", "document", "author_id", "created_at", "updated_at")
  VALUES ("trips_restore"."trip", newest.revision + 1, the_document, the_viewer, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp());
  DELETE FROM "public"."trip_revisions" AS "revision"
  WHERE "revision"."trip_id" = "trips_restore"."trip" AND "revision"."revision" <= newest.revision + 1 - 100;
  RETURN newest.revision + 1;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."trips_restore"(uuid, integer, timestamp with time zone, integer) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."trips_restore"(uuid, integer, timestamp with time zone, integer) TO "trips_app";
