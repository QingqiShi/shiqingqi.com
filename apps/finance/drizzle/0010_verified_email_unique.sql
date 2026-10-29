DROP INDEX "users_email_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "users_verified_email_key" ON "users" USING btree ("email") WHERE "users"."email_verified_at" IS NOT NULL;
