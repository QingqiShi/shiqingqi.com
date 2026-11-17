CREATE TABLE "trip_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "trip_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "trip_invites" ADD CONSTRAINT "trip_invites_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Only an owner of a trip makes, sees and ends its invites. `trips_app` sees
-- of `trip_members` only the rows of the user in `trips.user_id`.
CREATE FUNCTION "public"."trips_viewer_owns"("trip" uuid) RETURNS boolean
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT EXISTS (SELECT 1 FROM "public"."trip_members" WHERE "trip_members"."trip_id" = "trips_viewer_owns"."trip" AND "trip_members"."user_id" = public.trips_viewer_id() AND "trip_members"."role" = 'owner') $$;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "trip_invites" TO "trips_app";--> statement-breakpoint
ALTER TABLE "trip_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "owner_sees" ON "trip_invites" AS PERMISSIVE FOR SELECT TO "trips_app" USING (public.trips_viewer_owns("trip_id"));--> statement-breakpoint
CREATE POLICY "owner_makes" ON "trip_invites" AS PERMISSIVE FOR INSERT TO "trips_app" WITH CHECK (public.trips_viewer_owns("trip_id"));--> statement-breakpoint
CREATE POLICY "owner_ends" ON "trip_invites" AS PERMISSIVE FOR DELETE TO "trips_app" USING (public.trips_viewer_owns("trip_id"));--> statement-breakpoint
-- The four functions below run as the owner of the tables, which row-level
-- security does not limit, so each one makes its own check of the viewer.
-- They are the only way for `trips_app` to change `trip_members`, to read
-- the member rows and the emails of other users, and to read an invite that
-- the viewer did not make.
CREATE FUNCTION "public"."trips_invite_is_open"("hash" text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM "public"."trip_invites" AS "invite" WHERE "invite"."token_hash" = "trips_invite_is_open"."hash" AND "invite"."expires_at" > pg_catalog.now()) $$;--> statement-breakpoint
-- Makes the viewer an editor of the trip of an open invite, ends the invite,
-- and gives the slug of the trip. A viewer who is a member already keeps the
-- role and the invite stays open. NULL for an invite that is not open, and
-- for no viewer.
CREATE FUNCTION "public"."trips_accept_invite"("hash" text) RETURNS text
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
  WHERE "invite"."token_hash" = "trips_accept_invite"."hash" AND "invite"."expires_at" > pg_catalog.now()
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
  RETURN (SELECT "trip"."slug" FROM "public"."trips" AS "trip" WHERE "trip"."id" = the_invite.trip_id);
END
$$;--> statement-breakpoint
CREATE FUNCTION "public"."trips_members_of"("trip" uuid) RETURNS TABLE ("user_id" uuid, "email" text, "role" text, "joined_at" timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT "member"."user_id", "person"."email", "member"."role", "member"."created_at" FROM "public"."trip_members" AS "member" INNER JOIN "public"."users" AS "person" ON "person"."id" = "member"."user_id" WHERE "member"."trip_id" = "trips_members_of"."trip" AND public.trips_viewer_owns("trips_members_of"."trip") $$;--> statement-breakpoint
-- An owner stays: a trip must keep one.
CREATE FUNCTION "public"."trips_remove_member"("trip" uuid, "member" uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ WITH "gone" AS (DELETE FROM "public"."trip_members" AS "row" WHERE "row"."trip_id" = "trips_remove_member"."trip" AND "row"."user_id" = "trips_remove_member"."member" AND "row"."role" <> 'owner' AND public.trips_viewer_owns("trips_remove_member"."trip") RETURNING 1) SELECT EXISTS (SELECT 1 FROM "gone") $$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."trips_invite_is_open"(text), "public"."trips_accept_invite"(text), "public"."trips_members_of"(uuid), "public"."trips_remove_member"(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."trips_invite_is_open"(text), "public"."trips_accept_invite"(text), "public"."trips_members_of"(uuid), "public"."trips_remove_member"(uuid, uuid) TO "trips_app";
