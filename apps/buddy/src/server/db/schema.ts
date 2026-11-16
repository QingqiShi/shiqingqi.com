import { makeAuthTables } from "@tuja/server-auth/make-auth-tables";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

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
export const { emailCodes, signUps, passkeys, sessions } = makeAuthTables(
  () => accounts.id,
);

/** One-use links, sent to the account's email, that replace its passkeys. Only the token's hash is stored. */
export const recoveries = pgTable(
  "recoveries",
  {
    id: uuid("id").primaryKey(),
    userId: userId(),
    tokenHash: bytea("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("recoveries_user_idx").on(t.userId)],
);

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

export const schema = {
  accounts,
  passkeys,
  sessions,
  emailCodes,
  signUps,
  recoveries,
  machines,
  buddyUsageDays,
};
