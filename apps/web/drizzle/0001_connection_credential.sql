ALTER TABLE "connections" ADD COLUMN "credential" "bytea";--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "credential_last_four" text;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "credential_saved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "connections" DROP COLUMN "secret_env";