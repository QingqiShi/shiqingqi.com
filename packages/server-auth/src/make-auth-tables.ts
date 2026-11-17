import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

/**
 * The tables of sign-in, the same in each app. `userId` gives the id column
 * of the app's own table of users, which the app keeps.
 */
export function makeAuthTables(userId: () => AnyPgColumn) {
  function userIdColumn() {
    return uuid("user_id")
      .notNull()
      .references(userId, { onDelete: "cascade" });
  }

  /**
   * A six-digit code emailed with a link, that continues the flow in the
   * browser that asked for it. Only the code's hash is stored, and the
   * browser holds the row's id in a sealed cookie.
   */
  const emailCodes = pgTable("email_codes", {
    id: uuid("id").primaryKey(),
    purpose: text("purpose", {
      enum: ["recovery", "sign-up", "email-change"],
    }).notNull(),
    email: text("email").notNull(),
    codeHash: bytea("code_hash").notNull(),
    /** Each check counts, right or wrong; the code ends at the limit. */
    attempts: smallint("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  });

  /** One-use links that let a person who confirmed `email` make a user. Only the token's hash is stored. */
  const signUps = pgTable("sign_ups", {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    tokenHash: bytea("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  });

  /** One-use links that replace the passkeys of a user. Only the token's hash is stored. */
  const recoveries = pgTable(
    "recoveries",
    {
      id: uuid("id").primaryKey(),
      userId: userIdColumn(),
      tokenHash: bytea("token_hash").notNull().unique(),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      usedAt: timestamp("used_at", { withTimezone: true }),
      /** False for a link that a person gives to the user by hand. A request by email does not end such a link. */
      emailed: boolean("emailed").notNull().default(true),
      createdAt: createdAt(),
    },
    (t) => [index("recoveries_user_idx").on(t.userId)],
  );

  const passkeys = pgTable(
    "passkeys",
    {
      id: text("id").primaryKey(),
      userId: userIdColumn(),
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

  const sessions = pgTable(
    "sessions",
    {
      id: uuid("id").primaryKey(),
      userId: userIdColumn(),
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

  return { emailCodes, signUps, recoveries, passkeys, sessions };
}
