CREATE TABLE "institution_domain_guesses" (
	"name_key" text NOT NULL,
	"base_currency" text NOT NULL,
	"account_currency" text NOT NULL,
	"domain" text,
	"guessed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institution_domain_guesses_name_key_base_currency_account_currency_pk" PRIMARY KEY("name_key","base_currency","account_currency")
);
--> statement-breakpoint
CREATE TABLE "institution_icons" (
	"domain" text PRIMARY KEY NOT NULL,
	"image" "bytea",
	"version" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "institution_domain" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "guessed_institution_domain" text;