ALTER TABLE "todos" ADD COLUMN "waiting_on" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "follow_up_date" date;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "waiting_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "waiting_note" text;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_follow_up_needs_waiting" CHECK ("todos"."follow_up_date" is null or "todos"."waiting_on" is not null);--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_waiting_has_since" CHECK (("todos"."waiting_on" is null) = ("todos"."waiting_since" is null));