ALTER TABLE "agent_runs" ADD COLUMN "progress" jsonb;--> statement-breakpoint
ALTER TABLE "morning_reports" ADD COLUMN "seen_at" timestamp with time zone;