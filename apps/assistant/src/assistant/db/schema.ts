import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("mail_accounts_address_key").on(t.userId, t.provider, t.address),
  ],
);

/** The user's own name for a kind of mail. Each account files it into one folder. */
export const mailCategories = pgTable(
  "mail_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("mail_categories_name_key").on(t.userId, t.name)],
);

/**
 * A folder of an account as the last sync saw it, with its counts and the
 * sync cursor. The cursor is valid only while `cursorUidValidity` matches
 * the folder's UIDVALIDITY on the server.
 */
export const mailFolders = pgTable(
  "mail_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => mailAccounts.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    name: text("name").notNull(),
    delimiter: text("delimiter"),
    /** The IMAP special-use flag, such as `\Sent`, or null. */
    specialUse: text("special_use"),
    messageCount: integer("message_count"),
    unseenCount: integer("unseen_count"),
    countedAt: timestamp("counted_at", { withTimezone: true }),
    categoryId: uuid("category_id").references(() => mailCategories.id, {
      onDelete: "set null",
    }),
    cursorUidValidity: bigint("cursor_uid_validity", { mode: "number" }),
    /** The highest UID that sync has fetched or skipped. */
    cursorLastUid: bigint("cursor_last_uid", { mode: "number" }),
    /** The highest UID when sync first saw the folder: mail at or below it is history. */
    cursorBaselineUid: bigint("cursor_baseline_uid", { mode: "number" }),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("mail_folders_path_key").on(t.accountId, t.path),
    uniqueIndex("mail_folders_category_key")
      .on(t.accountId, t.categoryId)
      .where(sql`${t.categoryId} is not null`),
    index("mail_folders_user_idx").on(t.userId),
  ],
);

export const MAIL_MESSAGE_ORIGINS = ["live", "history"] as const;
export type MailMessageOrigin = (typeof MAIL_MESSAGE_ORIGINS)[number];

/**
 * One mail, stored once per user by its Message-ID. Sync stores mail that
 * arrives after the account connected as `live`; history import stores the
 * rest. `snippet` is cleaned text from the first part of the message.
 */
export const mailMessages = pgTable(
  "mail_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: userId(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => mailAccounts.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => mailFolders.id, {
      onDelete: "set null",
    }),
    uidValidity: bigint("uid_validity", { mode: "number" }).notNull(),
    uid: bigint("uid", { mode: "number" }).notNull(),
    messageId: text("message_id").notNull(),
    inReplyTo: text("in_reply_to"),
    references: text("references")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    fromAddress: text("from_address"),
    fromName: text("from_name"),
    replyTo: text("reply_to"),
    toAddresses: text("to_addresses")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    ccAddresses: text("cc_addresses")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    subject: text("subject").notNull().default(""),
    /** The Date header. */
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** The server's INTERNALDATE. */
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    /** The IMAP flags when sync fetched the mail. */
    flags: text("flags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    listId: text("list_id"),
    listUnsubscribe: text("list_unsubscribe"),
    autoSubmitted: text("auto_submitted"),
    precedence: text("precedence"),
    size: integer("size"),
    snippet: text("snippet").notNull().default(""),
    origin: text("origin", { enum: MAIL_MESSAGE_ORIGINS })
      .notNull()
      .default("live"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("mail_messages_message_id_key").on(t.userId, t.messageId),
    index("mail_messages_received_idx").on(t.userId, t.receivedAt),
    index("mail_messages_folder_uid_idx").on(t.folderId, t.uid),
    index("mail_messages_account_idx").on(t.accountId),
  ],
);

export const schema = {
  users,
  passkeys,
  sessions,
  invites,
  userSettings,
  mailAccounts,
  mailCategories,
  mailFolders,
  mailMessages,
};
