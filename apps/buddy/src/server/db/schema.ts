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
  smallint,
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
  createdAt: createdAt(),
});

/** Six-digit codes sent by email for a sign-up or a recovery. Only a hash of each code is stored. */
export const emailCodes = pgTable("email_codes", {
  id: uuid("id").primaryKey(),
  purpose: text("purpose", { enum: ["recovery", "sign-up"] }).notNull(),
  email: text("email").notNull(),
  codeHash: bytea("code_hash").notNull(),
  /** Each check counts, right or wrong; the code ends at the limit. */
  attempts: smallint("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** One-use links that let a person who confirmed `email` make an account. Only the token's hash is stored. */
export const signUps = pgTable("sign_ups", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: bytea("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

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

export const passkeys = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    userId: userId(),
    publicKey: bytea("public_key").notNull(),
    counter: bigint("counter", { mode: "number" }).notNull().default(0),
    transports: text("transports")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [index("passkeys_user_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: userId(),
    tokenHash: bytea("token_hash").notNull().unique(),
    createdAt: createdAt(),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent").notNull().default(""),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
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
