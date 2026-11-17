-- The drop that 0021 did not do. The snapshot of 0021 already leaves out the
-- two columns, so this is a custom migration. The invite lookup is made again
-- without the column, and the read of `users` that only `recovery_members`
-- used is taken back. The owner becomes a member of `finance_auth` for this,
-- as in 0019.
DO $$
BEGIN
  EXECUTE format('GRANT "finance_auth" TO %I', current_user);
END
$$;--> statement-breakpoint
DROP FUNCTION "finance_auth"."recovery_members"(text);--> statement-breakpoint
REVOKE SELECT ("id", "email", "email_verified_at") ON "users" FROM "finance_auth";--> statement-breakpoint
DROP FUNCTION "finance_auth"."invite_by_token"(bytea, timestamptz);--> statement-breakpoint
CREATE FUNCTION "finance_auth"."invite_by_token"(token_hash bytea, at timestamptz)
RETURNS TABLE (invite_id uuid, household_id uuid, household_name text, member_id uuid, member_name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT invites.id, invites.household_id, households.name, members.id, members.name
  FROM public.invites
  JOIN public.members ON members.id = invites.member_id AND members.household_id = invites.household_id
  JOIN public.households ON households.id = invites.household_id
  WHERE invites.token_hash = invite_by_token.token_hash
    AND invites.used_at IS NULL
    AND invites.expires_at > invite_by_token.at
    AND members.deleted_at IS NULL
    AND members.user_id IS NULL
$$;--> statement-breakpoint
ALTER FUNCTION "finance_auth"."invite_by_token"(bytea, timestamptz) OWNER TO "finance_auth";--> statement-breakpoint
REVOKE ALL ON FUNCTION "finance_auth"."invite_by_token"(bytea, timestamptz) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "finance_auth"."invite_by_token"(bytea, timestamptz) TO "finance_app";--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('REVOKE "finance_auth" FROM %I', current_user);
END
$$;--> statement-breakpoint
ALTER TABLE "invites" DROP CONSTRAINT "invites_recovery_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "invites" DROP COLUMN "recovery_user_id";--> statement-breakpoint
ALTER TABLE "passkeys" DROP COLUMN "device_name";
