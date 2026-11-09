ALTER TABLE "accounts" ADD COLUMN "visitor_fed" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "visitor_patted" bigint DEFAULT 0 NOT NULL;