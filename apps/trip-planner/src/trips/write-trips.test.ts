import { PGlite } from "@electric-sql/pglite";
import { asc, eq, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { users } from "#src/db/auth-schema.ts";
import {
  schema,
  tripInvites,
  tripMembers,
  tripRevisions,
  trips,
} from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "./as-viewer.ts";
import type { DraftOp } from "./ops/apply-ops.ts";
import { withExpect } from "./ops/apply-ops.ts";
import { readTrips } from "./read-trips.ts";
import { writeTrips } from "./write-trips.ts";

let client: PGlite;
let db: TripsDb;

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

const NEW_TRIP = {
  title: "Three days in Rome",
  firstDate: "2027-03-01",
  days: 3,
  timeZone: "Europe/Rome",
  language: "en",
} as const;

async function tripOf(userId: string, tripId: string) {
  const viewed = (await readTrips(db, userId)).find(({ id }) => id === tripId);
  if (!viewed) throw new Error(`No trip ${tripId} for ${userId}.`);
  return viewed.trip;
}

/** Renames the first day of the trip, as the user sees it now. */
async function renameFirstDay(userId: string, tripId: string, title: string) {
  const trip = await tripOf(userId, tripId);
  const drafts: DraftOp[] = [
    { op: "setDay", id: trip.days[0].id, fields: { title } },
  ];
  return writeTrips.change(db, userId, tripId, withExpect(trip, drafts));
}

function revisionsOf(tripId: string) {
  return db
    .select({
      revision: tripRevisions.revision,
      authorId: tripRevisions.authorId,
    })
    .from(tripRevisions)
    .where(eq(tripRevisions.tripId, tripId))
    .orderBy(asc(tripRevisions.revision));
}

/** Makes the newest revision of the trip as old as `age`, a Postgres interval. */
async function age(tripId: string, interval: string) {
  await db.execute(
    sql`update trip_revisions set created_at = clock_timestamp() - ${interval}::interval
        where trip_id = ${tripId} and revision = (select max(revision) from trip_revisions where trip_id = ${tripId})`,
  );
}

/** Runs a statement as the user, as the app does. */
async function runAs(userId: string | null, statement: SQL) {
  await asViewer(db, userId, (tx) => tx.execute(statement));
}

/** What a function of the database gives the user. */
async function callAs(userId: string | null, call: SQL): Promise<unknown> {
  const [{ value }] = await asViewer(db, userId, (tx) =>
    tx.select({ value: sql<unknown>`value` }).from(sql`${call} as value`),
  );
  return value;
}

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
});

afterAll(() => client.close());

it("makes a trip, its first revision and its owner together, and nothing for no user", async () => {
  const owner = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);

  expect(await revisionsOf(tripId)).toEqual([{ revision: 1, authorId: owner }]);
  const [{ role }] = await db
    .select({ role: tripMembers.role })
    .from(tripMembers)
    .where(eq(tripMembers.tripId, tripId));
  expect(role).toBe("owner");
  const trip = await tripOf(owner, tripId);
  expect(trip.days.map((day) => day.date)).toEqual([
    "2027-03-01",
    "2027-03-02",
    "2027-03-03",
  ]);

  const before = await db.$count(trips);
  expect(await callAs(null, sql`public.trips_create('{}'::jsonb)`)).toBeNull();
  await expect(
    runAs(null, sql`insert into trips default values`),
  ).rejects.toThrow();
  expect(await db.$count(trips)).toBe(before);
});

it("puts the saves of one author within 10 minutes in one revision, and starts a new one after", async () => {
  const owner = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);

  expect(await renameFirstDay(owner, tripId, "Arrive")).toMatchObject({
    status: "applied",
    revision: 1,
  });
  await age(tripId, "9 minutes 59 seconds");
  await renameFirstDay(owner, tripId, "Arrive in Rome");
  expect(await revisionsOf(tripId)).toHaveLength(1);

  await age(tripId, "10 minutes 1 second");
  expect(await renameFirstDay(owner, tripId, "Rome")).toMatchObject({
    status: "applied",
    revision: 2,
  });
  expect((await tripOf(owner, tripId)).days[0].title).toBe("Rome");
});

it("lets an editor change a trip, in a revision of the editor's own", async () => {
  const owner = await addUser();
  const editor = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);
  await db
    .insert(tripMembers)
    .values({ tripId, userId: editor, role: "editor" });

  expect(await renameFirstDay(editor, tripId, "Colosseum")).toMatchObject({
    status: "applied",
  });
  expect(await revisionsOf(tripId)).toEqual([
    { revision: 1, authorId: owner },
    { revision: 2, authorId: editor },
  ]);
});

it("keeps the newest 100 revisions of a trip", async () => {
  const owner = await addUser();
  const other = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);
  const [{ document }] = await db
    .select({ document: tripRevisions.document })
    .from(tripRevisions)
    .where(eq(tripRevisions.tripId, tripId));
  await db.insert(tripRevisions).values(
    Array.from({ length: 99 }, (_, i) => ({
      tripId,
      revision: i + 2,
      document,
      authorId: other,
    })),
  );

  await renameFirstDay(owner, tripId, "Arrive");
  const kept = await revisionsOf(tripId);
  expect(kept).toHaveLength(100);
  expect(kept[0].revision).toBe(2);
  expect(kept.at(-1)).toEqual({ revision: 101, authorId: owner });
});

it("refuses a save that read an older revision, so that no save is lost", async () => {
  const owner = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);
  const [read] = await db
    .select({
      revision: tripRevisions.revision,
      updatedAt: sql<string>`${tripRevisions.updatedAt}::text`,
    })
    .from(tripRevisions)
    .where(eq(tripRevisions.tripId, tripId));
  // Another save comes between this read and this save.
  await renameFirstDay(owner, tripId, "Arrive");

  await expect(
    callAs(
      owner,
      sql`public.trips_save(${tripId}, ${read.revision}, ${read.updatedAt}::timestamptz, '{}'::jsonb)`,
    ),
  ).rejects.toMatchObject({ cause: { code: "40001" } });
  expect((await tripOf(owner, tripId)).days[0].title).toBe("Arrive");
});

it("lets no one who is not a member, and no one signed out, change a trip", async () => {
  const owner = await addUser();
  const stranger = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);
  const trip = await tripOf(owner, tripId);
  const ops = withExpect(trip, [
    { op: "setTrip", fields: { title: "Mine now" } },
  ]);

  expect(await writeTrips.change(db, stranger, tripId, ops)).toEqual({
    status: "not_found",
  });
  for (const viewer of [stranger, null]) {
    expect(
      await callAs(
        viewer,
        sql`public.trips_save(${tripId}, 1, now(), '{}'::jsonb)`,
      ),
    ).toBeNull();
    await expect(
      runAs(
        viewer,
        sql`update trip_revisions set document = '{}'::jsonb where trip_id = ${tripId}`,
      ),
    ).rejects.toThrow();
  }
  expect((await tripOf(owner, tripId)).title).toBe(NEW_TRIP.title);
});

it("deletes a trip with its revisions, members and invites for an owner only", async () => {
  const owner = await addUser();
  const editor = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);
  await db
    .insert(tripMembers)
    .values({ tripId, userId: editor, role: "editor" });
  await db.insert(tripInvites).values({
    tripId,
    tokenHash: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 60_000),
  });

  expect(await writeTrips.remove(db, editor, tripId)).toBe(false);
  expect(await db.$count(trips, eq(trips.id, tripId))).toBe(1);

  expect(await writeTrips.remove(db, owner, tripId)).toBe(true);
  expect(await db.$count(trips, eq(trips.id, tripId))).toBe(0);
  expect(await db.$count(tripRevisions, eq(tripRevisions.tripId, tripId))).toBe(
    0,
  );
  expect(await db.$count(tripMembers, eq(tripMembers.tripId, tripId))).toBe(0);
  expect(await db.$count(tripInvites, eq(tripInvites.tripId, tripId))).toBe(0);
});
