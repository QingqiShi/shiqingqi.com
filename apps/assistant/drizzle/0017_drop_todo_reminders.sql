DROP INDEX "todos_reminder_idx";--> statement-breakpoint
ALTER TABLE "todos" DROP COLUMN "remind_at";--> statement-breakpoint
ALTER TABLE "todos" DROP COLUMN "snoozed_until";--> statement-breakpoint
ALTER TABLE "todos" DROP COLUMN "reminded_at";