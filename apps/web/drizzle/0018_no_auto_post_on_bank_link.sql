-- The owner of these tables runs this migration. FORCE ROW LEVEL SECURITY
-- applies the policy to the owner too, thus the UPDATE finds no rows.
-- Remove FORCE for the UPDATE only. Use a short lock timeout: each query of
-- an older deployment on these tables waits behind the ALTER.
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "households" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rules" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_links" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Give each changed Rule the next version of its Household and move the
-- clock to it, so that each Replica pulls the Rule again.
WITH "changed" AS (
  UPDATE "rules"
  SET "auto_post" = false,
    "version" = "households"."clock" + 1,
    "updated_at" = now()
  FROM "households"
  WHERE "households"."id" = "rules"."household_id"
    AND "rules"."auto_post"
    AND EXISTS (
      SELECT 1 FROM "bank_links"
      WHERE "bank_links"."household_id" = "rules"."household_id"
        AND "bank_links"."deleted_at" IS NULL
        AND "rules"."template" -> 'entries' @> jsonb_build_array(
          jsonb_build_object('accountId', "bank_links"."account_id"::text)
        )
    )
  RETURNING "rules"."household_id"
)
UPDATE "households" SET "clock" = "clock" + 1
WHERE "id" IN (SELECT "household_id" FROM "changed");--> statement-breakpoint
ALTER TABLE "bank_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rules" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "households" FORCE ROW LEVEL SECURITY;
