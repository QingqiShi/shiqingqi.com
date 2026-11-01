import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

export const DEFAULT_TIME_ZONE = "Europe/London";
export const DEFAULT_DIGEST_HOUR = 8;

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

function updatedAt() {
  return timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
}

// Global tables: reachable without a user scope, because sign-in reads them
// before the user is known.

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: createdAt(),
});

export const passkeys = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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

/** One-use links made with `assistant:invite-link`. Only the token's hash is stored. */
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey(),
  tokenHash: bytea("token_hash").notNull().unique(),
  /** The name of the new user; for a recovery invite, the user's name when it was made. */
  displayName: text("display_name").notNull(),
  /** Set when the invite lets a user who lost every passkey back in. */
  recoveryUserId: uuid("recovery_user_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

// User tables: each row belongs to one user, and row level security limits
// every statement to the user in `app.user_id` (see `with-user.ts`). The
// migration of each new user table calls `isolate_user_table`.

function userId() {
  return uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
}

export const userSettings = pgTable(
  "user_settings",
  {
    userId: userId().primaryKey(),
    timeZone: text("time_zone").notNull().default(DEFAULT_TIME_ZONE),
    /** The local hour of the morning digest. */
    digestHour: smallint("digest_hour").notNull().default(DEFAULT_DIGEST_HOUR),
    /** Off until the user has reviewed the classification: then the app may mark, flag and move mail. */
    mailboxWrites: boolean("mailbox_writes").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "user_settings_digest_hour_check",
      sql`${t.digestHour} between 0 and 23`,
    ),
  ],
);

export const schema = {
  users,
  passkeys,
  sessions,
  invites,
  userSettings,
};
