ALTER TABLE "households" ADD COLUMN "demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "households_one_demo" ON "households" USING btree ("demo") WHERE "households"."demo";--> statement-breakpoint
-- The session lookup also tells whether the Household is the demo, and a new
-- lookup finds the demo's owner for the sign-in page. The migration owner
-- must be a member of `finance_auth` to drop and hand over its functions; the
-- membership is taken back at the end, as in 0002.
DO $$
BEGIN
  EXECUTE format('GRANT "finance_auth" TO %I', current_user);
END
$$;--> statement-breakpoint
DROP FUNCTION "finance_auth"."memberships_of_user"(uuid);--> statement-breakpoint
CREATE FUNCTION "finance_auth"."memberships_of_user"(user_id uuid)
RETURNS TABLE (household_id uuid, member_id uuid, role public.member_role, demo boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT members.household_id, members.id, members.role, households.demo
  FROM public.members
  JOIN public.households ON households.id = members.household_id
  WHERE members.user_id = memberships_of_user.user_id AND members.deleted_at IS NULL
  ORDER BY members.created_at, members.id
$$;--> statement-breakpoint
CREATE FUNCTION "finance_auth"."demo_owner"()
RETURNS TABLE (household_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT households.id, members.user_id
  FROM public.households
  JOIN public.members ON members.household_id = households.id
  WHERE households.demo
    AND members.role = 'owner'
    AND members.deleted_at IS NULL
    AND members.user_id IS NOT NULL
  ORDER BY members.created_at, members.id
  LIMIT 1
$$;--> statement-breakpoint
ALTER FUNCTION "finance_auth"."memberships_of_user"(uuid) OWNER TO "finance_auth";--> statement-breakpoint
ALTER FUNCTION "finance_auth"."demo_owner"() OWNER TO "finance_auth";--> statement-breakpoint
REVOKE ALL ON FUNCTION "finance_auth"."memberships_of_user"(uuid), "finance_auth"."demo_owner"() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "finance_auth"."memberships_of_user"(uuid), "finance_auth"."demo_owner"() TO "finance_app";--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('REVOKE "finance_auth" FROM %I', current_user);
END
$$;
