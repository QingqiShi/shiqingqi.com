import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt } from "./created-at.ts";
import { bytea, minor } from "./minor.ts";

// identity and tenancy

/** The unique index that lets at most one user have a given Recovery email verified. */
export const VERIFIED_EMAIL_KEY = "users_verified_email_key";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull(),
    /** The Recovery email, lower-case. At most one user has a given address verified. */
    email: text("email"),
    /** Set when the user opened the verification link for `email`. Recovery mail goes only to a verified email. */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex(VERIFIED_EMAIL_KEY)
      .on(t.email)
      .where(sql`${t.emailVerifiedAt} IS NOT NULL`),
  ],
);

/** One-use links that confirm a user's Recovery email. Only the token's hash is stored. */
export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The address the link went to. It verifies only while the user's email is still this one. */
    email: text("email").notNull(),
    /** The confirmed Recovery email that `email` replaces. It gets a notice when the link is opened. */
    replacesEmail: text("replaces_email"),
    tokenHash: bytea("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("email_verifications_user_idx").on(t.userId)],
);

/**
 * A six-digit code emailed with a link, that continues the flow in the
 * browser that asked for it. Only the code's hash is stored, and the
 * browser holds the row's id in a sealed cookie.
 */
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

/** One-use links that let a person who confirmed `email` create a Household and its Owner. Only the token's hash is stored. */
export const signUps = pgTable("sign_ups", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: bytea("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
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
    counter: minor("counter").notNull().default(0),
    transports: text("transports")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    deviceName: text("device_name").notNull().default(""),
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
