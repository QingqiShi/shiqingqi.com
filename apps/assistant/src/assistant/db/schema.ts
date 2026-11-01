import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { MorningReportContent } from "../report/types.ts";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

export const DEFAULT_TIME_ZONE = "Europe/London";
export const DEFAULT_DIGEST_HOUR = 8;

export const USER_LOCALES = ["en", "zh"] as const;
export type UserLocale = (typeof USER_LOCALES)[number];

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

function updatedAt() {
  return timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
}

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
    /** The local hour of the morning report. */
    digestHour: smallint("digest_hour").notNull().default(DEFAULT_DIGEST_HOUR),
    /** The language of the pages and of the reports the model writes. */
    locale: text("locale", { enum: USER_LOCALES }).notNull().default("en"),
    /** Off until the user turns it on: then a cron files every inbox mail into a folder and marks it read. */
    organiseEnabled: boolean("organise_enabled").notNull().default(false),
    /** The user's own words on where mail goes, for the model that picks a folder. */
    organiseNotes: text("organise_notes").notNull().default(""),
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

export const MAIL_PROVIDERS = ["icloud", "gmail", "outlook"] as const;
export type MailProvider = (typeof MAIL_PROVIDERS)[number];

export const MAIL_ACCOUNT_STATUSES = ["ok", "error", "reconnect"] as const;
export type MailAccountStatus = (typeof MAIL_ACCOUNT_STATUSES)[number];

/** A connected mailbox. `credential` is sealed with `ASSISTANT_CREDENTIAL_KEY` (see `account-credential.ts`). */
export const mailAccounts = pgTable(
  "mail_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    provider: text("provider", { enum: MAIL_PROVIDERS }).notNull(),
    /** Lower case. The IMAP login name. */
    address: text("address").notNull(),
    credential: bytea("credential").notNull(),
    /** `reconnect` when the provider refused the stored login: only a new connect fixes it. */
    status: text("status", { enum: MAIL_ACCOUNT_STATUSES })
      .notNull()
      .default("ok"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    /** The last failed mailbox write; cleared by a write run without failures. */
    writeErrorCode: text("write_error_code"),
    writeErrorMessage: text("write_error_message"),
    writeErrorAt: timestamp("write_error_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("mail_accounts_address_key").on(t.userId, t.provider, t.address),
  ],
);

/**
 * The morning report of one local day: what the model wrote about the mail
 * of the day before. It holds no mail, only the model's words, counts and
 * the Message-IDs that its lines link to.
 */
export const morningReports = pgTable(
  "morning_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    /** The day of the report in the user's time zone, `YYYY-MM-DD`. */
    localDate: date("local_date", { mode: "string" }).notNull(),
    content: jsonb("content").$type<MorningReportContent>().notNull(),
    /** Null when no model wrote the report. */
    modelId: text("model_id"),
    builtAt: timestamp("built_at", { withTimezone: true }).notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [unique("morning_reports_date_key").on(t.userId, t.localDate)],
);

/**
 * A to-do that a morning report found in the mail. Of the mail it keeps
 * only the account and the Message-ID, so that the page can open it.
 */
export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    title: text("title").notNull(),
    detail: text("detail"),
    dueDate: date("due_date", { mode: "string" }),
    sourceAccountId: uuid("source_account_id").references(
      () => mailAccounts.id,
      { onDelete: "set null" },
    ),
    /** The Message-ID header of the mail, in angle brackets. */
    sourceMessageId: text("source_message_id"),
    createdReportId: uuid("created_report_id").references(
      () => morningReports.id,
      { onDelete: "set null" },
    ),
    createdAt: createdAt(),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (t) => [
    index("todos_open_idx")
      .on(t.userId, t.createdAt)
      .where(sql`${t.doneAt} is null`),
    index("todos_report_idx").on(t.createdReportId),
  ],
);

/** One device that gets the morning report notification. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent").notNull().default(""),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [unique("push_subscriptions_endpoint_key").on(t.userId, t.endpoint)],
);

export const schema = {
  users,
  passkeys,
  sessions,
  userSettings,
  mailAccounts,
  pushSubscriptions,
  morningReports,
  todos,
};
