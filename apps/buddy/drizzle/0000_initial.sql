CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_name_unique" UNIQUE("name"),
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "buddy_usage_days" (
	"user_id" text NOT NULL,
	"machine_id" text NOT NULL,
	"day" date NOT NULL,
	"tokens" bigint NOT NULL,
	"cost_usd" double precision NOT NULL,
	"cache_read" bigint,
	"prompt_tokens" bigint,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buddy_usage_days_user_id_machine_id_day_pk" PRIMARY KEY("user_id","machine_id","day")
);
--> statement-breakpoint
CREATE TABLE "email_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"email" text NOT NULL,
	"code_hash" "bytea" NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"machine_id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"public_key" "bytea" NOT NULL,
	"counter" bigint DEFAULT 0 NOT NULL,
	"transports" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recoveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recoveries_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sign_ups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_ups_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recoveries" ADD CONSTRAINT "recoveries_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "machines_active_key_idx" ON "machines" USING btree ("user_id","public_key") WHERE "machines"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "passkeys_user_idx" ON "passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recoveries_user_idx" ON "recoveries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");