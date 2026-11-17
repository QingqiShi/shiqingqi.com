import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
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
  kind: text("kind", { enum: ["edit", "draft"] }).notNull(),
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
  createdAt: createdAt(),
});

export const schema = {
  trips,
  tripRevisions,
  tripMembers,
  tripInvites,
  aiRuns,
  ...authSchema,
};
