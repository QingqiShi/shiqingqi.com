ALTER TABLE "todos" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "rejection_note" text;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_rejected_is_deleted" CHECK ("todos"."rejected_at" is null or "todos"."deleted_at" is not null);--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_rejection_note_needs_rejected" CHECK ("todos"."rejection_note" is null or "todos"."rejected_at" is not null);