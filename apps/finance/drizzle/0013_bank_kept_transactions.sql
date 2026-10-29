CREATE TABLE "bank_kept_transactions" (
	"household_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_kept_transactions_link_id_transaction_id_pk" PRIMARY KEY("link_id","transaction_id")
);
--> statement-breakpoint
ALTER TABLE "bank_kept_transactions" ADD CONSTRAINT "bank_kept_transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_kept_transactions" ADD CONSTRAINT "bank_kept_transactions_link_fk" FOREIGN KEY ("household_id","link_id") REFERENCES "public"."bank_links"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_kept_transactions" ADD CONSTRAINT "bank_kept_transactions_transaction_fk" FOREIGN KEY ("household_id","transaction_id") REFERENCES "public"."transactions"("household_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
SELECT "public"."isolate_household_table"('"bank_kept_transactions"');
