-- Existing rows take `created_by = 'report'` from the column default of 0004.
UPDATE "todos" SET "updated_at" = "created_at";
--> statement-breakpoint
-- Until now, only the content of a report held why the report agent closed a to-do.
UPDATE "todos" AS t
SET "done_reason" = closed."reason"
FROM "morning_reports" AS r,
  jsonb_to_recordset(r."content" -> 'doneTodos') AS closed("id" text, "reason" text)
WHERE r."user_id" = t."user_id"
  AND t."id"::text = closed."id"
  AND t."done_at" IS NOT NULL;
