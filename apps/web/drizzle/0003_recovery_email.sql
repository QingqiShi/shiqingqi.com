CREATE TABLE "email_verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verifications_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "email_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"email" text NOT NULL,
	"code_hash" "bytea" NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verifications_user_idx" ON "email_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
-- The recovery lookup reads users and their Members across Households, so
-- it is a `finance_auth` function. As in 0002, the owner becomes a member of
-- `finance_auth` to create it, and gives that membership back at the end.
DO $$
BEGIN
  EXECUTE format('GRANT "finance_auth" TO %I', current_user);
END
$$;--> statement-breakpoint
GRANT SELECT ("id", "email", "email_verified_at") ON "users" TO "finance_auth";--> statement-breakpoint
CREATE FUNCTION "finance_auth"."recovery_members"(email text)
RETURNS TABLE (household_id uuid, household_name text, member_id uuid, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT households.id, households.name, members.id, users.id
  FROM public.users
  JOIN public.members ON members.user_id = users.id
  JOIN public.households ON households.id = members.household_id
  WHERE users.email = recovery_members.email
    AND users.email_verified_at IS NOT NULL
    AND members.deleted_at IS NULL
  ORDER BY households.name, households.id, members.id
$$;--> statement-breakpoint
ALTER FUNCTION "finance_auth"."recovery_members"(text) OWNER TO "finance_auth";--> statement-breakpoint
REVOKE ALL ON FUNCTION "finance_auth"."recovery_members"(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "finance_auth"."recovery_members"(text) TO "finance_app";--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('REVOKE "finance_auth" FROM %I', current_user);
END
$$;
