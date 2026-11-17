ALTER TABLE "trips" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
-- A trip's path is its id now. The code does not know `slug`. The column and
-- `trips_accept_invite`, which gives the slug, go in the next migration, when
-- no live code uses them.
-- Makes the viewer an editor of the trip of an open invite, ends the invite,
-- and gives the id of the trip. A viewer who is a member already keeps the
-- role and the invite stays open. NULL for an invite that is not open, and
-- for no viewer.
CREATE FUNCTION "public"."trips_join_by_invite"("hash" text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_invite record;
BEGIN
  IF the_viewer IS NULL THEN
    RETURN NULL;
  END IF;
  -- The lock makes a second request with the same invite wait, and then
  -- find no row.
  SELECT "invite"."id", "invite"."trip_id" INTO the_invite
  FROM "public"."trip_invites" AS "invite"
  WHERE "invite"."token_hash" = "trips_join_by_invite"."hash" AND "invite"."expires_at" > pg_catalog.now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  INSERT INTO "public"."trip_members" ("trip_id", "user_id", "role")
  VALUES (the_invite.trip_id, the_viewer, 'editor')
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    DELETE FROM "public"."trip_invites" AS "invite" WHERE "invite"."id" = the_invite.id;
  END IF;
  RETURN the_invite.trip_id;
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."trips_join_by_invite"(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."trips_join_by_invite"(text) TO "trips_app";
