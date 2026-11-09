DELETE FROM "todos" WHERE "repeat" IS NOT NULL OR "next_todo_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" DROP CONSTRAINT "todos_next_todo_id_todos_id_fk";
--> statement-breakpoint
ALTER TABLE "todos" DROP COLUMN "repeat";--> statement-breakpoint
ALTER TABLE "todos" DROP COLUMN "next_todo_id";