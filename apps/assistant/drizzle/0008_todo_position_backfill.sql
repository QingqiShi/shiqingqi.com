-- Existing rows start in the order the list showed them: by due date, the oldest first in one date.
UPDATE "todos" AS t
SET "position" = ordered."place"
FROM (
  SELECT "id", row_number() OVER (ORDER BY "due_date" NULLS LAST, "created_at", "title") AS "place"
  FROM "todos"
) AS ordered
WHERE t."id" = ordered."id";
