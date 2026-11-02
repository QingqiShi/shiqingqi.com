ALTER TABLE "todos" ADD COLUMN "created_by" text DEFAULT 'report' NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "owner_edited_fields" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "re_adds_todo_id" uuid;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "done_reason" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_re_adds_todo_id_todos_id_fk" FOREIGN KEY ("re_adds_todo_id") REFERENCES "public"."todos"("id") ON DELETE set null ON UPDATE no action;