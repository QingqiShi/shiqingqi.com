ALTER TABLE "households" ADD COLUMN "ai_instructions" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "labelled_by" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "ai_reason" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_labelled_by_check" CHECK ("transactions"."labelled_by" in ('member', 'ai'));--> statement-breakpoint
UPDATE "transactions" SET "labelled_by" = 'ai' WHERE "source" = 'bank' AND ("needs_review" OR "updated_at" = "created_at");--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "ai_confidence";--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "label_attempts" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
DROP TABLE "payee_aliases" CASCADE;
