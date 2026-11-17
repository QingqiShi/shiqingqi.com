CREATE TABLE "buddy_usage_models" (
	"user_id" text NOT NULL,
	"machine_id" text NOT NULL,
	"day" date NOT NULL,
	"model" text NOT NULL,
	"rate" text DEFAULT '' NOT NULL,
	"input_tokens" bigint NOT NULL,
	"output_tokens" bigint NOT NULL,
	"cache_read_tokens" bigint NOT NULL,
	"cache_write_5m_tokens" bigint NOT NULL,
	"cache_write_1h_tokens" bigint NOT NULL,
	"messages" bigint NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buddy_usage_models_user_id_machine_id_day_model_rate_pk" PRIMARY KEY("user_id","machine_id","day","model","rate")
);
--> statement-breakpoint
ALTER TABLE "buddy_usage_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ("input_tokens", "output_tokens", "cache_read_tokens", "cache_write_5m_tokens", "cache_write_1h_tokens", "messages", "archived_at") ON "buddy_usage_models" TO "buddy_archive";--> statement-breakpoint
CREATE POLICY "archive_reads" ON "buddy_usage_models" AS PERMISSIVE FOR SELECT TO "buddy_archive" USING (true);--> statement-breakpoint
-- A model's day is written under the account of the Mac that counted it.
CREATE POLICY "archive_writes" ON "buddy_usage_models" AS PERMISSIVE FOR INSERT TO "buddy_archive" WITH CHECK (EXISTS (SELECT 1 FROM "machines" WHERE "machines"."machine_id" = "buddy_usage_models"."machine_id" AND "machines"."user_id"::text = "buddy_usage_models"."user_id"));--> statement-breakpoint
CREATE POLICY "archive_raises" ON "buddy_usage_models" AS PERMISSIVE FOR UPDATE TO "buddy_archive" USING (true) WITH CHECK (EXISTS (SELECT 1 FROM "machines" WHERE "machines"."machine_id" = "buddy_usage_models"."machine_id" AND "machines"."user_id"::text = "buddy_usage_models"."user_id"));
