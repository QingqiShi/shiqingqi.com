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

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** The path of the trip, as in `/gb`. */
  slug: text("slug").notNull().unique(),
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
 * joins or when an owner ends the link (`drizzle/0003_invites.sql`).
 */
export const tripInvites = pgTable("trip_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
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
