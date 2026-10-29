ALTER TABLE "bank_links" ADD COLUMN "bank_rows_waiting" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- The owner of "bank_links" runs this migration. FORCE ROW LEVEL SECURITY
-- applies the policy to the owner too, thus the UPDATE finds no rows.
-- Remove FORCE for the UPDATE only. Use a short lock timeout: each query of
-- an older deployment on these tables waits behind the ALTER.
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "bank_links" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_transactions" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
UPDATE "bank_links" SET "bank_rows_waiting" = true
WHERE EXISTS (
  SELECT 1 FROM "bank_transactions"
  WHERE "bank_transactions"."household_id" = "bank_links"."household_id"
    AND "bank_transactions"."link_id" = "bank_links"."id"
    AND "bank_transactions"."state" = 'new'
    AND "bank_transactions"."currency" = "bank_links"."currency"
    AND "bank_transactions"."amount_minor" <> 0
);--> statement-breakpoint
ALTER TABLE "bank_transactions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bank_links" DROP COLUMN "balance_difference_minor";--> statement-breakpoint
ALTER TABLE "balance_check_days" RENAME TO "balance_drift_days";--> statement-breakpoint
ALTER SEQUENCE "balance_check_days_id_seq" RENAME TO "balance_drift_days_id_seq";--> statement-breakpoint
ALTER TABLE "balance_drift_days" RENAME CONSTRAINT "balance_check_days_pkey" TO "balance_drift_days_pkey";--> statement-breakpoint
ALTER TABLE "balance_drift_days" RENAME CONSTRAINT "balance_check_days_household_id_households_id_fk" TO "balance_drift_days_household_id_households_id_fk";--> statement-breakpoint
ALTER INDEX "balance_check_days_household_idx" RENAME TO "balance_drift_days_household_idx";--> statement-breakpoint
ALTER FUNCTION "public"."queue_entry_balance_checks"() RENAME TO "queue_entry_balance_drift";--> statement-breakpoint
ALTER FUNCTION "public"."queue_valuation_balance_checks"() RENAME TO "queue_valuation_balance_drift";--> statement-breakpoint
ALTER FUNCTION "public"."queue_transaction_balance_checks"() RENAME TO "queue_transaction_balance_drift";--> statement-breakpoint
ALTER FUNCTION "public"."queue_balance_day_checks"() RENAME TO "queue_balance_day_drift";--> statement-breakpoint
ALTER FUNCTION "public"."queue_all_balance_checks"() RENAME TO "queue_all_balance_drift";--> statement-breakpoint
ALTER TRIGGER "entries_insert_balance_checks" ON "entries" RENAME TO "entries_insert_balance_drift";--> statement-breakpoint
ALTER TRIGGER "entries_update_balance_checks" ON "entries" RENAME TO "entries_update_balance_drift";--> statement-breakpoint
ALTER TRIGGER "entries_delete_balance_checks" ON "entries" RENAME TO "entries_delete_balance_drift";--> statement-breakpoint
ALTER TRIGGER "valuations_insert_balance_checks" ON "valuations" RENAME TO "valuations_insert_balance_drift";--> statement-breakpoint
ALTER TRIGGER "valuations_update_balance_checks" ON "valuations" RENAME TO "valuations_update_balance_drift";--> statement-breakpoint
ALTER TRIGGER "valuations_delete_balance_checks" ON "valuations" RENAME TO "valuations_delete_balance_drift";--> statement-breakpoint
ALTER TRIGGER "transactions_update_balance_checks" ON "transactions" RENAME TO "transactions_update_balance_drift";--> statement-breakpoint
ALTER TRIGGER "account_balance_days_insert_balance_checks" ON "account_balance_days" RENAME TO "account_balance_days_insert_balance_drift";--> statement-breakpoint
ALTER TRIGGER "account_balance_days_update_balance_checks" ON "account_balance_days" RENAME TO "account_balance_days_update_balance_drift";--> statement-breakpoint
ALTER TRIGGER "account_balance_days_delete_balance_checks" ON "account_balance_days" RENAME TO "account_balance_days_delete_balance_drift";--> statement-breakpoint
ALTER TRIGGER "entries_truncate_balance_checks" ON "entries" RENAME TO "entries_truncate_balance_drift";--> statement-breakpoint
ALTER TRIGGER "valuations_truncate_balance_checks" ON "valuations" RENAME TO "valuations_truncate_balance_drift";--> statement-breakpoint
ALTER TRIGGER "transactions_truncate_balance_checks" ON "transactions" RENAME TO "transactions_truncate_balance_drift";--> statement-breakpoint
ALTER TRIGGER "account_balance_days_truncate_balance_checks" ON "account_balance_days" RENAME TO "account_balance_days_truncate_balance_drift";--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."queue_entry_balance_drift"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT DISTINCT household_id, account_id, date FROM new_rows;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT DISTINCT household_id, account_id, date FROM old_rows;
  ELSE
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT DISTINCT changed.household_id, changed.account_id, changed.day
    FROM old_rows o
    FULL JOIN new_rows n ON n.id = o.id
    CROSS JOIN LATERAL (
      VALUES (o.household_id, o.account_id, o.date),
             (n.household_id, n.account_id, n.date)
    ) AS changed (household_id, account_id, day)
    WHERE changed.account_id IS NOT NULL
      AND (o.household_id, o.account_id, o.date, o.amount_minor, o.transaction_id, o.deleted_at IS NULL)
        IS DISTINCT FROM
          (n.household_id, n.account_id, n.date, n.amount_minor, n.transaction_id, n.deleted_at IS NULL);
  END IF;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."queue_valuation_balance_drift"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT DISTINCT household_id, account_id, "on" FROM new_rows;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT DISTINCT household_id, account_id, "on" FROM old_rows;
  ELSE
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT DISTINCT changed.household_id, changed.account_id, changed.day
    FROM old_rows o
    FULL JOIN new_rows n ON n.id = o.id
    CROSS JOIN LATERAL (
      VALUES (o.household_id, o.account_id, o."on"),
             (n.household_id, n.account_id, n."on")
    ) AS changed (household_id, account_id, day)
    WHERE changed.account_id IS NOT NULL
      AND (o.household_id, o.account_id, o."on", o.amount_minor, o.deleted_at IS NULL)
        IS DISTINCT FROM
          (n.household_id, n.account_id, n."on", n.amount_minor, n.deleted_at IS NULL);
  END IF;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."queue_transaction_balance_drift"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.balance_drift_days (household_id, account_id, day)
  SELECT DISTINCT e.household_id, e.account_id, e.date
  FROM old_rows o
  JOIN new_rows n ON n.id = o.id
  JOIN public.entries e ON e.transaction_id = n.id
  WHERE e.deleted_at IS NULL
    AND (o.status, o.deleted_at IS NULL) IS DISTINCT FROM (n.status, n.deleted_at IS NULL);
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."queue_balance_day_drift"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT household_id, account_id, day FROM new_rows;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT household_id, account_id, day FROM old_rows;
  ELSE
    INSERT INTO public.balance_drift_days (household_id, account_id, day)
    SELECT DISTINCT changed.household_id, changed.account_id, changed.day
    FROM old_rows o
    FULL JOIN new_rows n ON n.account_id = o.account_id AND n.day = o.day
    CROSS JOIN LATERAL (
      VALUES (o.household_id, o.account_id, o.day),
             (n.household_id, n.account_id, n.day)
    ) AS changed (household_id, account_id, day)
    WHERE changed.account_id IS NOT NULL
      AND (o.household_id, o.balance_minor, o.deleted_at IS NULL)
        IS DISTINCT FROM (n.household_id, n.balance_minor, n.deleted_at IS NULL);
  END IF;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."queue_all_balance_drift"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.balance_drift_days (household_id, account_id, day)
  SELECT household_id, account_id, date FROM public.entries
  UNION
  SELECT household_id, account_id, "on" FROM public.valuations
  UNION
  SELECT household_id, account_id, day FROM public.account_balance_days;
  RETURN NULL;
END
$$;
