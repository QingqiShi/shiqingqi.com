ALTER TABLE "todos" ADD COLUMN "repeat" jsonb;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "next_todo_id" uuid;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_next_todo_id_todos_id_fk" FOREIGN KEY ("next_todo_id") REFERENCES "public"."todos"("id") ON DELETE set null ON UPDATE no action;