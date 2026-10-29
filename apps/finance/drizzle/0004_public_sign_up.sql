CREATE TABLE "sign_ups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_ups_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_household_user_key";--> statement-breakpoint
ALTER TABLE "invites" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_key" UNIQUE("user_id");--> statement-breakpoint
-- Sign-in setup is gone, and with it the one caller of `owner_members`. As
-- in 0002, the owner becomes a member of `finance_auth` to drop it, and gives
-- that membership back at the end.
DO $$
BEGIN
  EXECUTE format('GRANT "finance_auth" TO %I', current_user);
END
$$;--> statement-breakpoint
DROP FUNCTION "finance_auth"."owner_members"();--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('REVOKE "finance_auth" FROM %I', current_user);
END
$$;
