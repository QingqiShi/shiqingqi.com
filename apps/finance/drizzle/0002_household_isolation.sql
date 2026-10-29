ALTER TABLE "account_balance_days" DROP CONSTRAINT "account_balance_days_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_group_id_account_groups_id_fk";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_owner_member_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_default_payment_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "bank_balances" DROP CONSTRAINT "bank_balances_link_id_bank_links_id_fk";--> statement-breakpoint
ALTER TABLE "bank_links" DROP CONSTRAINT "bank_links_connection_id_connections_id_fk";--> statement-breakpoint
ALTER TABLE "bank_links" DROP CONSTRAINT "bank_links_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "bank_transactions" DROP CONSTRAINT "bank_transactions_link_id_bank_links_id_fk";--> statement-breakpoint
ALTER TABLE "bank_transactions" DROP CONSTRAINT "bank_transactions_transaction_id_transactions_id_fk";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "entries" DROP CONSTRAINT "entries_transaction_id_transactions_id_fk";--> statement-breakpoint
ALTER TABLE "entries" DROP CONSTRAINT "entries_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "invites" DROP CONSTRAINT "invites_member_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "month_totals" DROP CONSTRAINT "month_totals_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "payee_aliases" DROP CONSTRAINT "payee_aliases_payee_id_payees_id_fk";--> statement-breakpoint
ALTER TABLE "payees" DROP CONSTRAINT "payees_default_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "payees" DROP CONSTRAINT "payees_default_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "payees" DROP CONSTRAINT "payees_merged_into_id_payees_id_fk";--> statement-breakpoint
ALTER TABLE "transaction_tags" DROP CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk";--> statement-breakpoint
ALTER TABLE "transaction_tags" DROP CONSTRAINT "transaction_tags_tag_id_tags_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_payee_id_payees_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_member_id_members_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_rule_id_rules_id_fk";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_refund_of_id_transactions_id_fk";--> statement-breakpoint
ALTER TABLE "valuations" DROP CONSTRAINT "valuations_account_id_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "account_groups" ADD CONSTRAINT "account_groups_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "bank_links" ADD CONSTRAINT "bank_links_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "payees" ADD CONSTRAINT "payees_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_id_key" UNIQUE("household_id","id");--> statement-breakpoint
ALTER TABLE "account_balance_days" ADD CONSTRAINT "account_balance_days_account_fk" FOREIGN KEY ("household_id","account_id") REFERENCES "public"."accounts"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_group_fk" FOREIGN KEY ("household_id","group_id") REFERENCES "public"."account_groups"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_member_fk" FOREIGN KEY ("household_id","owner_member_id") REFERENCES "public"."members"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_default_payment_account_fk" FOREIGN KEY ("household_id","default_payment_account_id") REFERENCES "public"."accounts"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_balances" ADD CONSTRAINT "bank_balances_link_fk" FOREIGN KEY ("household_id","link_id") REFERENCES "public"."bank_links"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_links" ADD CONSTRAINT "bank_links_connection_fk" FOREIGN KEY ("household_id","connection_id") REFERENCES "public"."connections"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_links" ADD CONSTRAINT "bank_links_account_fk" FOREIGN KEY ("household_id","account_id") REFERENCES "public"."accounts"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_link_fk" FOREIGN KEY ("household_id","link_id") REFERENCES "public"."bank_links"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_transaction_fk" FOREIGN KEY ("household_id","transaction_id") REFERENCES "public"."transactions"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_fk" FOREIGN KEY ("household_id","parent_id") REFERENCES "public"."categories"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_transaction_fk" FOREIGN KEY ("household_id","transaction_id") REFERENCES "public"."transactions"("household_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_account_fk" FOREIGN KEY ("household_id","account_id") REFERENCES "public"."accounts"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_member_fk" FOREIGN KEY ("household_id","member_id") REFERENCES "public"."members"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "month_totals" ADD CONSTRAINT "month_totals_category_fk" FOREIGN KEY ("household_id","category_id") REFERENCES "public"."categories"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payee_aliases" ADD CONSTRAINT "payee_aliases_payee_fk" FOREIGN KEY ("household_id","payee_id") REFERENCES "public"."payees"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payees" ADD CONSTRAINT "payees_default_category_fk" FOREIGN KEY ("household_id","default_category_id") REFERENCES "public"."categories"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payees" ADD CONSTRAINT "payees_default_account_fk" FOREIGN KEY ("household_id","default_account_id") REFERENCES "public"."accounts"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payees" ADD CONSTRAINT "payees_merged_into_fk" FOREIGN KEY ("household_id","merged_into_id") REFERENCES "public"."payees"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_fk" FOREIGN KEY ("household_id","transaction_id") REFERENCES "public"."transactions"("household_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_fk" FOREIGN KEY ("household_id","tag_id") REFERENCES "public"."tags"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_fk" FOREIGN KEY ("household_id","category_id") REFERENCES "public"."categories"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payee_fk" FOREIGN KEY ("household_id","payee_id") REFERENCES "public"."payees"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_member_fk" FOREIGN KEY ("household_id","member_id") REFERENCES "public"."members"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_rule_fk" FOREIGN KEY ("household_id","rule_id") REFERENCES "public"."rules"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_refund_of_fk" FOREIGN KEY ("household_id","refund_of_id") REFERENCES "public"."transactions"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_account_fk" FOREIGN KEY ("household_id","account_id") REFERENCES "public"."accounts"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Roles. `finance_app` is the role the app runs as inside every transaction
-- (`set local role finance_app`): it may read and write the tables, and row
-- level security limits it to the Household in `app.household_id`.
-- `finance_auth` owns the few functions that look across Households before a
-- Household is known (session, sign-in, invite, setup, crons). The role that
-- runs this migration (the owner) must be a member of both to set role to
-- them and to hand functions to `finance_auth`; its membership in
-- `finance_auth` is taken back at the end.
CREATE ROLE "finance_app" NOLOGIN NOBYPASSRLS;--> statement-breakpoint
CREATE ROLE "finance_auth" NOLOGIN NOBYPASSRLS;--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('GRANT "finance_app", "finance_auth" TO %I', current_user);
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA "public" TO "finance_app";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "finance_app";--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "finance_app";--> statement-breakpoint
-- No SET clause: Postgres inlines the function into each policy, so a scan
-- reads the setting once, not once per row.
CREATE FUNCTION "public"."current_household_id"() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(pg_catalog.current_setting('app.household_id', true), '')::pg_catalog.uuid $$;--> statement-breakpoint
-- Limits every statement on `target` to the rows whose `key` is the Household
-- in `app.household_id`, for every role (FORCE: the owner too). Call it for
-- each new Household table.
CREATE FUNCTION "public"."isolate_household_table"(target regclass, key name DEFAULT 'household_id') RETURNS void
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
  EXECUTE format(
    'CREATE POLICY "household_isolation" ON %s AS PERMISSIVE FOR ALL TO PUBLIC USING (%I = public.current_household_id()) WITH CHECK (%I = public.current_household_id())',
    target, key, key
  );
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."isolate_household_table"(regclass, name) FROM PUBLIC;--> statement-breakpoint
SELECT "public"."isolate_household_table"('"households"', 'id');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"members"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"invites"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"account_groups"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"accounts"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"valuations"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"categories"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"payees"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"payee_aliases"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"tags"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"rules"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"transactions"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"entries"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"transaction_tags"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"account_balance_days"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"month_totals"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"fx_rates"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"applied_mutations"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"connections"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"bank_links"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"bank_transactions"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"bank_balances"');--> statement-breakpoint
SELECT "public"."isolate_household_table"('"reports"');--> statement-breakpoint
-- The lookups that run before a Household is known. They run as
-- `finance_auth`, which may only read `households`, `members` and `invites`,
-- and only `finance_app` may call them.
CREATE SCHEMA "finance_auth" AUTHORIZATION "finance_auth";--> statement-breakpoint
GRANT USAGE ON SCHEMA "finance_auth" TO "finance_app";--> statement-breakpoint
GRANT SELECT ON "households", "members", "invites" TO "finance_auth";--> statement-breakpoint
CREATE POLICY "household_lookup" ON "households" AS PERMISSIVE FOR SELECT TO "finance_auth" USING (true);--> statement-breakpoint
CREATE POLICY "household_lookup" ON "members" AS PERMISSIVE FOR SELECT TO "finance_auth" USING (true);--> statement-breakpoint
CREATE POLICY "household_lookup" ON "invites" AS PERMISSIVE FOR SELECT TO "finance_auth" USING (true);--> statement-breakpoint
CREATE FUNCTION "finance_auth"."household_ids"() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$ SELECT id FROM public.households ORDER BY id $$;--> statement-breakpoint
CREATE FUNCTION "finance_auth"."memberships_of_user"(user_id uuid)
RETURNS TABLE (household_id uuid, member_id uuid, role public.member_role)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT household_id, id, role
  FROM public.members
  WHERE members.user_id = memberships_of_user.user_id AND deleted_at IS NULL
  ORDER BY created_at, id
$$;--> statement-breakpoint
CREATE FUNCTION "finance_auth"."owner_members"()
RETURNS TABLE (household_id uuid, household_name text, member_id uuid, member_name text, user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT households.id, households.name, members.id, members.name, members.user_id
  FROM public.members
  JOIN public.households ON households.id = members.household_id
  WHERE members.role = 'owner' AND members.deleted_at IS NULL
  ORDER BY households.created_at, members.created_at, members.id
$$;--> statement-breakpoint
CREATE FUNCTION "finance_auth"."invite_by_token"(token_hash bytea, at timestamptz)
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
    AND ((invites.recovery_user_id IS NULL AND members.user_id IS NULL) OR invites.recovery_user_id = members.user_id)
$$;--> statement-breakpoint
ALTER FUNCTION "finance_auth"."household_ids"() OWNER TO "finance_auth";--> statement-breakpoint
ALTER FUNCTION "finance_auth"."memberships_of_user"(uuid) OWNER TO "finance_auth";--> statement-breakpoint
ALTER FUNCTION "finance_auth"."owner_members"() OWNER TO "finance_auth";--> statement-breakpoint
ALTER FUNCTION "finance_auth"."invite_by_token"(bytea, timestamptz) OWNER TO "finance_auth";--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "finance_auth" FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "finance_auth" TO "finance_app";--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('REVOKE "finance_auth" FROM %I', current_user);
END
$$;
