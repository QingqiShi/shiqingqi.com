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

/** Each save of a trip, as a whole document. The newest revision is the trip. */
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
    createdAt: createdAt(),
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

export const schema = {
  trips,
  tripRevisions,
  tripMembers,
  tripInvites,
  ...authSchema,
};
