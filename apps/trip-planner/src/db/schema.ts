import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authSchema } from "./auth-schema.ts";

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
}

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** The path of the trip, as in `/gb`. Its password gate has the same key. */
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

export const schema = { trips, tripRevisions, ...authSchema };
