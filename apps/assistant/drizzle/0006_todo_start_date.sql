ALTER TABLE "todos" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_start_not_after_due" CHECK ("todos"."start_date" <= "todos"."due_date");