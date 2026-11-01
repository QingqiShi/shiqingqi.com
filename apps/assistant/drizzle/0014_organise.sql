ALTER TABLE "user_settings" ADD COLUMN "organise_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "organise_notes" text DEFAULT '' NOT NULL;