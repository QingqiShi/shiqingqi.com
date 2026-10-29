CREATE TABLE "exchange_rates" (
	"base" char(3) NOT NULL,
	"quote" char(3) NOT NULL,
	"on" date NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"source" text NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "exchange_rates_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_base_quote_on_pk" PRIMARY KEY("base","quote","on"),
	CONSTRAINT "exchange_rates_source_check" CHECK ("exchange_rates"."source" in ('household', 'ecb')),
	CONSTRAINT "exchange_rates_rate_check" CHECK ("exchange_rates"."rate" > 0)
);
--> statement-breakpoint
CREATE INDEX "exchange_rates_seq_idx" ON "exchange_rates" USING btree ("seq");--> statement-breakpoint
-- The owner of "fx_rates" runs this migration, and FORCE ROW LEVEL SECURITY
-- applies the policy to the owner too, so the copy would see no rows. Remove
-- FORCE for the copy only. ENABLE stays, so finance_app stays isolated. The
-- ALTER needs an ACCESS EXCLUSIVE lock. Do not wait long for it, because
-- each query of an older deployment on "fx_rates" waits behind the ALTER.
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "fx_rates" NO FORCE ROW LEVEL SECURITY;--> statement-breakpoint
INSERT INTO "exchange_rates" ("base", "quote", "on", "rate", "source")
SELECT DISTINCT ON ("base", "quote", "on") "base", "quote", "on", "rate", 'household'
FROM "fx_rates"
WHERE "rate" <> 1 AND "rate" > 0 AND "base" <> "quote"
ORDER BY "base", "quote", "on", "household_id";--> statement-breakpoint
ALTER TABLE "fx_rates" FORCE ROW LEVEL SECURITY;