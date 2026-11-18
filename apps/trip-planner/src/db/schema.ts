import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { authSchema, users } from "./auth-schema.ts";

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

/** A trip. Its id is its path, as in `/<id>`. */
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: createdAt(),
});

/**
 * The saves of a trip, as whole documents. The newest revision is the trip.
 * Saves by one author within 10 minutes of the start of the newest revision
 * go into that revision, and a trip keeps its newest 100
 * (`trips_save` in `drizzle/0006_trip_writes.sql`).
 */
export const tripRevisions = pgTable(
  "trip_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    /** A `Trip`. Read it through `tripSchema`, never as it is. */
    document: jsonb("document").notNull(),
    /** Who saved it; null for an imported trip and after the user is deleted. */
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("trip_revisions_trip_revision_key").on(t.tripId, t.revision)],
);

/**
 * Who can open a trip. Row-level security shows a trip, its revisions and
 * its member rows only to these users (`drizzle/0002_members.sql`).
 */
export const tripMembers = pgTable(
  "trip_members",
  {
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.userId] })],
);

/**
 * A link that lets one person join a trip as an editor. The link holds a
 * random token and the row holds only its hash. The row goes when the person
 * joins, when an owner ends the link (`drizzle/0003_invites.sql`), or when
 * the owner who made it deletes the account (`drizzle/0004_delete_account.sql`).
 */
export const tripInvites = pgTable("trip_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  /** Null only for a link made before the column was added, on a trip that had more than one owner. */
  createdBy: uuid("created_by")
    .default(sql`public.trips_viewer_id()`)
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: createdAt(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/**
 * One row for each request to change or draft a trip with a model: the
 * counts, never the text. A member cannot read or write the rows; the app
 * writes one only through `trips_log_ai_run` (`drizzle/0007_ai_runs.sql`).
 * A row stays when its user or its trip goes.
 */
export const aiRuns = pgTable("ai_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  tripId: uuid("trip_id").references(() => trips.id, {
    onDelete: "set null",
  }),
  kind: text("kind", {
    enum: ["edit", "draft", "assistant", "summary", "research", "reader"],
  }).notNull(),
  model: text("model").notNull(),
  status: text("status", {
    enum: ["ok", "invalid", "failed", "aborted", "timeout"],
  }).notNull(),
  /** The requests to the model: 1, and one more for each repair. */
  rounds: integer("rounds").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cacheReadTokens: integer("cache_read_tokens").notNull(),
  cacheWriteTokens: integer("cache_write_tokens").notNull(),
  durationMs: integer("duration_ms").notNull(),
  /** The web searches and page fetches of a research run; null for other runs. */
  webSearches: integer("web_searches"),
  webFetches: integer("web_fetches"),
  createdAt: createdAt(),
});

/**
 * One segment of the assistant's conversation of one user, in one trip or,
 * before the trip is made, in none. Only its user reads it, and while it has
 * a trip, the user must be a member of that trip: removing the member removes
 * the rows (`drizzle/0009_assistant.sql`).
 */
export const assistantConversations = pgTable(
  "assistant_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").references(() => trips.id, {
      onDelete: "cascade",
    }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Null until the first message. */
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    /** Null while the segment is open. A user has one open segment per trip. */
    endedAt: timestamp("ended_at", { withTimezone: true }),
    summary: text("summary"),
    summaryAt: timestamp("summary_at", { withTimezone: true }),
    /** The turn that runs now, while `turnExpiresAt` is still ahead. */
    turnId: uuid("turn_id"),
    turnExpiresAt: timestamp("turn_expires_at", { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: "assistant_conversations_member_fk",
      columns: [t.tripId, t.userId],
      foreignColumns: [tripMembers.tripId, tripMembers.userId],
    }).onDelete("cascade"),
    index("assistant_conversations_user_trip_idx").on(
      t.userId,
      t.tripId,
      t.startedAt,
    ),
    uniqueIndex("assistant_conversations_open_key")
      .on(t.userId, t.tripId)
      .where(sql`${t.endedAt} is null and ${t.tripId} is not null`),
    check(
      "assistant_conversations_summary_size",
      sql`char_length(${t.summary}) <= 8000`,
    ),
  ],
);

/**
 * The messages of a segment in order. A row is never changed: what happens
 * later, such as a decision on a change, is a new row.
 */
export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => assistantConversations.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    /** `model`: a message as the model SDK gave it. `event`: a later event that the app wrote. */
    kind: text("kind", { enum: ["model", "event"] }).notNull(),
    message: jsonb("message").notNull(),
    /** The names of attached files and the items read from them; never the files. */
    attachments: jsonb("attachments"),
    /** The turn that wrote the row. */
    turnId: uuid("turn_id"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("assistant_messages_conversation_seq_key").on(
      t.conversationId,
      t.seq,
    ),
  ],
);

export const assistantChangeKinds = [
  "applied",
  "proposal",
  "research",
] as const;

export const assistantChangeStatuses = [
  "applied",
  "pending",
  "accepted",
  "skipped",
  "undone",
  "refused",
] as const;

/**
 * What the assistant changed or offered in a trip. `applied`: a change that
 * it saved at once. `proposal`: ops that apply only when the user accepts
 * them. `research`: a card of found places whose actions each make an
 * `applied` child row. The app only applies the ops that it stored here,
 * never ops from the browser.
 */
export const assistantChanges = pgTable(
  "assistant_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => assistantConversations.id, { onDelete: "cascade" }),
    /** Null only for a research card of a conversation that has no trip yet. */
    tripId: uuid("trip_id").references(() => trips.id, {
      onDelete: "cascade",
    }),
    askerId: uuid("asker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: assistantChangeKinds }).notNull(),
    status: text("status", { enum: assistantChangeStatuses }).notNull(),
    /** The ops as the server stored them. */
    ops: jsonb("ops"),
    /** The ops that undo `ops`; null until they are applied. */
    inverseOps: jsonb("inverse_ops"),
    /** The revision that the ops saved. */
    revision: integer("revision"),
    /** What the card shows: its items, actions and where the content came from. */
    card: jsonb("card"),
    /** The research card that this change is an action of, and which action. */
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => assistantChanges.id,
      { onDelete: "cascade" },
    ),
    actionKey: text("action_key"),
    toolCallId: text("tool_call_id"),
    decidedBy: uuid("decided_by").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "assistant_changes_member_fk",
      columns: [t.tripId, t.askerId],
      foreignColumns: [tripMembers.tripId, tripMembers.userId],
    }).onDelete("cascade"),
    index("assistant_changes_conversation_idx").on(t.conversationId),
    index("assistant_changes_asker_trip_idx").on(t.askerId, t.tripId),
    uniqueIndex("assistant_changes_action_key").on(t.parentId, t.actionKey),
  ],
);

/**
 * The assistant's memory, as small files by path. A row with a trip is the
 * memory of that trip, which its members read; a row with a user is that
 * user's own memory across trips.
 */
export const assistantMemories = pgTable(
  "assistant_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").references(() => trips.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    path: text("path").notNull(),
    content: text("content").notNull(),
    /** Who wrote it last; null after that user is deleted. */
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("assistant_memories_trip_path_key")
      .on(t.tripId, t.path)
      .where(sql`${t.tripId} is not null`),
    uniqueIndex("assistant_memories_user_path_key")
      .on(t.userId, t.path)
      .where(sql`${t.userId} is not null`),
    check(
      "assistant_memories_one_scope",
      sql`(${t.tripId} is null) <> (${t.userId} is null)`,
    ),
    check(
      "assistant_memories_path_shape",
      sql`char_length(${t.path}) <= 200 and ${t.path} ~ '^[A-Za-z0-9_-][A-Za-z0-9._-]*(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$'`,
    ),
    check(
      "assistant_memories_content_size",
      sql`octet_length(${t.content}) <= 16384`,
    ),
  ],
);

export const schema = {
  trips,
  tripRevisions,
  tripMembers,
  tripInvites,
  aiRuns,
  assistantConversations,
  assistantMessages,
  assistantChanges,
  assistantMemories,
  ...authSchema,
};
