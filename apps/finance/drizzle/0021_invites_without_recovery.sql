-- The snapshot of this migration does not have `invites.recovery_user_id` and
-- `passkeys.device_name`, as the schema code. But this SQL does not drop the
-- columns, because the deployment that is live during the build still writes
-- them. A later custom migration drops them.
--
-- The invite lookup now ignores an invite that has a recovery user, in place
-- of the code. Its return type stays the same for the live deployment. The
-- owner becomes a member of `finance_auth` to replace it, as in 0019.
DO $$
BEGIN
  EXECUTE format('GRANT "finance_auth" TO %I', current_user);
END
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "finance_auth"."invite_by_token"(token_hash bytea, at timestamptz)
RETURNS TABLE (invite_id uuid, household_id uuid, household_name text, member_id uuid, member_name text, recovery_user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT invites.id, invites.household_id, households.name, members.id, members.name, invites.recovery_user_id
  FROM public.invites
  JOIN public.members ON members.id = invites.member_id AND members.household_id = invites.household_id
  JOIN public.households ON households.id = invites.household_id
  WHERE invites.token_hash = invite_by_token.token_hash
    AND invites.used_at IS NULL
    AND invites.expires_at > invite_by_token.at
    AND members.deleted_at IS NULL
    AND members.user_id IS NULL
    AND invites.recovery_user_id IS NULL
$$;--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('REVOKE "finance_auth" FROM %I', current_user);
END
$$;
