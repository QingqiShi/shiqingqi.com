CREATE TABLE "mail_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"category_id" uuid,
	"decided_by" text NOT NULL,
	"reason" text NOT NULL,
	"sender_rule_id" uuid,
	"facts" jsonb,
	"summary" text,
	"event" jsonb,
	"model_id" text,
	"prompt_version" integer,
	"attempts" smallint DEFAULT 1 NOT NULL,
	"classified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_classifications_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "mail_sender_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"match" text NOT NULL,
	"pattern" text NOT NULL,
	"bucket" text NOT NULL,
	"category_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_message_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_sender_rules_pattern_key" UNIQUE("user_id","match","pattern")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_classifications" ADD CONSTRAINT "mail_classifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_classifications" ADD CONSTRAINT "mail_classifications_message_id_mail_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."mail_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_classifications" ADD CONSTRAINT "mail_classifications_category_id_mail_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."mail_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_classifications" ADD CONSTRAINT "mail_classifications_sender_rule_id_mail_sender_rules_id_fk" FOREIGN KEY ("sender_rule_id") REFERENCES "public"."mail_sender_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_sender_rules" ADD CONSTRAINT "mail_sender_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_sender_rules" ADD CONSTRAINT "mail_sender_rules_category_id_mail_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."mail_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_sender_rules" ADD CONSTRAINT "mail_sender_rules_source_message_id_mail_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."mail_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_classifications_open_idx" ON "mail_classifications" USING btree ("user_id","bucket") WHERE "mail_classifications"."done_at" is null;--> statement-breakpoint
CREATE INDEX "mail_messages_from_idx" ON "mail_messages" USING btree ("user_id","from_address");