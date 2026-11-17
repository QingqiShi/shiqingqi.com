ALTER TABLE "trip_invites" ADD COLUMN "created_by" uuid DEFAULT public.trips_viewer_id();--> statement-breakpoint
ALTER TABLE "trip_invites" ADD CONSTRAINT "trip_invites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Only an owner makes an invite. An open invite of a trip with one owner is
-- that owner's. On a trip with more owners, which only a local database has,
-- the column stays NULL.
UPDATE "trip_invites" AS "invite"
SET "created_by" = "owner"."user_id"
FROM "trip_members" AS "owner"
WHERE "owner"."trip_id" = "invite"."trip_id"
  AND "owner"."role" = 'owner'
  AND (SELECT count(*) FROM "trip_members" AS "other" WHERE "other"."trip_id" = "invite"."trip_id" AND "other"."role" = 'owner') = 1;--> statement-breakpoint
ALTER POLICY "owner_makes" ON "trip_invites" WITH CHECK (public.trips_viewer_owns("trip_id") AND "created_by" = public.trips_viewer_id());--> statement-breakpoint
-- The trips that `person` owns and no other user owns.
CREATE FUNCTION "public"."trips_owned_only_by"("person" uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT "mine"."trip_id" FROM "public"."trip_members" AS "mine" WHERE "mine"."user_id" = "trips_owned_only_by"."person" AND "mine"."role" = 'owner' AND NOT EXISTS (SELECT 1 FROM "public"."trip_members" AS "other" WHERE "other"."trip_id" = "mine"."trip_id" AND "other"."role" = 'owner' AND "other"."user_id" <> "trips_owned_only_by"."person") $$;--> statement-breakpoint
-- The trips that a deletion of the viewer's account deletes, for Settings.
-- `trips_app` cannot see the member rows of other users.
CREATE FUNCTION "public"."trips_viewer_owns_alone"() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.trips_owned_only_by(public.trips_viewer_id()) $$;--> statement-breakpoint
-- Takes a user whose account goes out of every trip. A trip that no other
-- user owns goes with its revisions, members and invites; a trip with one
-- more owner stays. The invites that the user made end. The account
-- deletion runs it as the owner of the tables, in its own transaction.
CREATE FUNCTION "public"."trips_forget_user"("person" uuid) RETURNS void
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  -- When two owners of one trip delete their accounts at the same time, the
  -- lock makes the second wait. It then finds no other owner and deletes the
  -- trip, so that no trip stays without an owner.
  PERFORM 1 FROM "public"."trips" AS "trip"
  WHERE "trip"."id" IN (SELECT "member"."trip_id" FROM "public"."trip_members" AS "member" WHERE "member"."user_id" = "trips_forget_user"."person" AND "member"."role" = 'owner')
  ORDER BY "trip"."id"
  FOR UPDATE;
  DELETE FROM "public"."trips" AS "trip" WHERE "trip"."id" IN (SELECT public.trips_owned_only_by("trips_forget_user"."person"));
  DELETE FROM "public"."trip_members" AS "member" WHERE "member"."user_id" = "trips_forget_user"."person";
  DELETE FROM "public"."trip_invites" AS "invite" WHERE "invite"."created_by" = "trips_forget_user"."person";
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."trips_owned_only_by"(uuid), "public"."trips_viewer_owns_alone"(), "public"."trips_forget_user"(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."trips_viewer_owns_alone"() TO "trips_app";
