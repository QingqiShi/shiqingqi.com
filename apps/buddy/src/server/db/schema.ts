import { makeAuthTables } from "@tuja/server-auth/make-auth-tables";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

function userId() {
  return uuid("user_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" });
}

/** A person with a pet. `name` is the `[user]` of `/u/[user]` and never changes. */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull().unique(),
  /** The address that signed up, lower-case and confirmed. A lost passkey is recovered through it. */
  email: text("email").notNull().unique(),
  /** False until the owner makes the page public. A private page is a 404 to everyone else. */
  isPublic: boolean("is_public").notNull().default(false),
  /**
   * How often the page's visitors watered and patted the pet: a copy of the Redis counts, which
   * the daily archive cron keeps and uses to restore a lost count.
   */
  visitorFed: bigint("visitor_fed", { mode: "number" }).notNull().default(0),
  visitorPatted: bigint("visitor_patted", { mode: "number" })
    .notNull()
    .default(0),
  createdAt: createdAt(),
});

/** The tables of sign-in that every app has. */
export const { emailCodes, signUps, recoveries, passkeys, sessions } =
  makeAuthTables(() => accounts.id);

/** A Mac that may upload for its account: it signs each upload with the private half of `public_key`. */
export const machines = pgTable(
  "machines",
  {
    /** Unique over every account, as it names the Mac's Redis keys. */
    machineId: text("machine_id").primaryKey(),
    userId: userId(),
    /** The raw 32-byte Ed25519 public key, in base64. */
    publicKey: text("public_key").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("machines_active_key_idx")
      .on(t.userId, t.publicKey)
      .where(sql`${t.revokedAt} is null`),
  ],
);

/** Each machine's daily usage, copied from Redis by the daily archive cron. `user_id` is the account id. */
export const buddyUsageDays = pgTable(
  "buddy_usage_days",
  {
    userId: text("user_id").notNull(),
    machineId: text("machine_id").notNull(),
    day: date("day").notNull(),
    tokens: bigint("tokens", { mode: "number" }).notNull(),
    costUsd: doublePrecision("cost_usd").notNull(),
    cacheRead: bigint("cache_read", { mode: "number" }),
    promptTokens: bigint("prompt_tokens", { mode: "number" }),
    archivedAt: timestamp("archived_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.machineId, table.day] }),
  ],
);

/**
 * Each machine's daily usage by model, copied from Redis by the daily archive
 * cron. A day of `buddy_usage_days` without a row here was counted before its
 * Mac sent the models. `user_id` is the account id. It holds no cost: a
 * reader prices the tokens with the price list it has then.
 */
export const buddyUsageModels = pgTable(
  "buddy_usage_models",
  {
    userId: text("user_id").notNull(),
    machineId: text("machine_id").notNull(),
    day: date("day").notNull(),
    model: text("model").notNull(),
    /** `long` for the tokens that the Mac prices at the model's long-prompt rate, empty for its standard rate. */
    rate: text("rate").notNull().default(""),
    /** Fresh input: not read from the cache and not written to it. */
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull(),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull(),
    cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).notNull(),
    cacheWrite5mTokens: bigint("cache_write_5m_tokens", {
      mode: "number",
    }).notNull(),
    cacheWrite1hTokens: bigint("cache_write_1h_tokens", {
      mode: "number",
    }).notNull(),
    messages: bigint("messages", { mode: "number" }).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.userId,
        table.machineId,
        table.day,
        table.model,
        table.rate,
      ],
    }),
  ],
);

export const schema = {
  accounts,
  passkeys,
  sessions,
  emailCodes,
  signUps,
  recoveries,
  machines,
  buddyUsageDays,
  buddyUsageModels,
};
