import { PGlite } from "@electric-sql/pglite";
import { asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { users } from "#src/db/auth-schema.ts";
import { schema, tripMembers, tripRevisions } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { withExpect } from "#src/trips/ops/apply-ops.ts";
import { readTrips } from "#src/trips/read-trips.ts";
import { writeTrips } from "#src/trips/write-trips.ts";
import { tripHistory } from "./trip-history.ts";

let client: PGlite;
let db: TripsDb;

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
});

afterAll(() => client.close());

async function addUser() {
  const [{ id }] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: `${crypto.randomUUID()}@example.com`,
    })
    .returning({ id: users.id });
  return id;
}

async function newTrip(owner: string) {
  return writeTrips.create(db, owner, {
    title: "Three days in Rome",
    firstDate: "2027-03-01",
    days: 3,
    timeZone: "Europe/Rome",
    language: "en",
  });
}

async function firstDayTitle(userId: string, tripId: string) {
  const viewed = (await readTrips(db, userId)).find(({ id }) => id === tripId);
  return viewed?.trip.days[0].title;
}

async function renameFirstDay(userId: string, tripId: string, title: string) {
  const viewed = (await readTrips(db, userId)).find(({ id }) => id === tripId);
  if (!viewed) throw new Error("No trip.");
  const ops = withExpect(viewed.trip, [
    { op: "setDay", id: viewed.trip.days[0].id, fields: { title } },
  ]);
  await writeTrips.change(db, userId, tripId, ops);
}

/** Makes every revision of the trip older than the 10 minutes in which saves of one author go into one revision. */
async function ageAll(tripId: string) {
  await db.execute(
    sql`update trip_revisions set created_at = created_at - interval '1 hour' where trip_id = ${tripId}`,
  );
}

async function newest(userId: string, tripId: string) {
  const versions = await tripHistory.list(db, userId, tripId);
  const [first] = versions ?? [];
  return first;
}

function titlesOf(tripId: string) {
  return db
    .select({
      revision: tripRevisions.revision,
      title: sql<string | null>`${tripRevisions.document} #>> '{days,0,title}'`,
    })
    .from(tripRevisions)
    .where(eq(tripRevisions.tripId, tripId))
    .orderBy(asc(tripRevisions.revision));
}

it("puts an old version back as a new revision, and keeps the one it replaces, also within the 10 minutes of the author's last save", async () => {
  const owner = await addUser();
  const tripId = await newTrip(owner);
  await renameFirstDay(owner, tripId, "Arrive");
  await ageAll(tripId);
  await renameFirstDay(owner, tripId, "Colosseum");

  // The save of a minute ago would take a later save of the owner.
  const seen = await newest(owner, tripId);
  expect(await tripHistory.restore(db, owner, tripId, seen, 1)).toEqual({
    status: "restored",
    revision: 3,
  });
  expect(await titlesOf(tripId)).toEqual([
    { revision: 1, title: "Arrive" },
    { revision: 2, title: "Colosseum" },
    { revision: 3, title: "Arrive" },
  ]);
  expect(await firstDayTitle(owner, tripId)).toBe("Arrive");
});

it("refuses a restore when the trip changed after the person saw it, and changes nothing", async () => {
  const owner = await addUser();
  const editor = await addUser();
  const tripId = await newTrip(owner);
  await db
    .insert(tripMembers)
    .values({ tripId, userId: editor, role: "editor" });
  await renameFirstDay(editor, tripId, "Arrive");

  const seen = await newest(owner, tripId);
  // The editor saves again, into the same revision, after the owner looked.
  await renameFirstDay(editor, tripId, "Arrive late");
  expect(await tripHistory.restore(db, owner, tripId, seen, 1)).toEqual({
    status: "conflict",
  });
  const fresh = await newest(owner, tripId);
  expect(await tripHistory.restore(db, owner, tripId, fresh, 99)).toEqual({
    status: "conflict",
  });
  expect(await firstDayTitle(owner, tripId)).toBe("Arrive late");
  expect(await titlesOf(tripId)).toHaveLength(2);
});

it("shows the versions and lets them be restored only to a member who can change the trip", async () => {
  const owner = await addUser();
  const stranger = await addUser();
  const tripId = await newTrip(owner);
  const seen = await newest(owner, tripId);

  expect(await tripHistory.list(db, stranger, tripId)).toBeNull();
  expect(await tripHistory.read(db, stranger, tripId, 1)).toBeNull();
  expect(await tripHistory.restore(db, stranger, tripId, seen, 1)).toEqual({
    status: "not_found",
  });
  expect(await titlesOf(tripId)).toHaveLength(1);
});
