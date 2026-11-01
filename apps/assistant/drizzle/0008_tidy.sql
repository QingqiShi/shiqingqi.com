CREATE TABLE "mail_write_states" (
	"message_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"seen_at" timestamp with time zone,
	"flagged_at" timestamp with time zone,
	"moved_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"lost_at" timestamp with time zone,
	"failures" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "write_error_code" text;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "write_error_message" text;--> statement-breakpoint
ALTER TABLE "mail_accounts" ADD COLUMN "write_error_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "mailbox_writes_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mail_write_states" ADD CONSTRAINT "mail_write_states_message_id_mail_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."mail_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_write_states" ADD CONSTRAINT "mail_write_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_write_states_open_idx" ON "mail_write_states" USING btree ("user_id") WHERE "mail_write_states"."finished_at" is null;