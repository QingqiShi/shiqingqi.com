import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { users } from "#src/db/auth-schema.ts";
import { schema, tripMembers, tripRevisions, trips } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { importTrip } from "./import-trip.ts";
import { readTrips } from "./read-trips.ts";
import sample from "./testing/sample-trip.json";

let client: PGlite;
let db: TripsDb;
let mara: string;
let noor: string;

async function addUser(email: string) {
  const [{ id }] = await db
    .insert(users)
    .values({ id: crypto.randomUUID(), email })
    .returning({ id: users.id });
  return id;
}

async function addMember(slug: string, userId: string) {
  const [{ id }] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(eq(trips.slug, slug));
  await db.insert(tripMembers).values({ tripId: id, userId, role: "owner" });
}

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
  mara = await addUser("mara@example.com");
  noor = await addUser("noor@example.com");
  await importTrip(db, sample);
  await importTrip(db, { ...sample, id: "porto", slug: "porto" });
  await addMember(sample.slug, mara);
  await addMember("porto", noor);
});

afterAll(() => client.close());

function slugsOf(userId: string | null) {
  return readTrips(db, userId).then((viewed) =>
    viewed.map(({ trip }) => trip.slug),
  );
}

it("gives a user the trips that the user is a member of, and a visitor none", async () => {
  expect(await slugsOf(mara)).toEqual([sample.slug]);
  expect(await slugsOf(noor)).toEqual(["porto"]);
  expect(await slugsOf(crypto.randomUUID())).toEqual([]);
  expect(await slugsOf(null)).toEqual([]);
});

it("shows the reader's role no row of another user, with no filter in the query", async () => {
  function countsAs(userId: string | null) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`set local role trips_app`);
      if (userId !== null) {
        await tx.execute(
          sql`select set_config('trips.user_id', ${userId}, true)`,
        );
      }
      return {
        trips: await tx.$count(trips),
        revisions: await tx.$count(tripRevisions),
        members: await tx.$count(tripMembers),
      };
    });
  }

  expect(await countsAs(mara)).toEqual({ trips: 1, revisions: 1, members: 1 });
  expect(await countsAs(crypto.randomUUID())).toEqual({
    trips: 0,
    revisions: 0,
    members: 0,
  });
  expect(await countsAs(null)).toEqual({ trips: 0, revisions: 0, members: 0 });
});

it("lets the reader's role reach no table of sign-in, and write nothing", async () => {
  function asReader(statement: ReturnType<typeof sql>) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('role', 'trips_app', true), set_config('trips.user_id', ${mara}, true)`,
      );
      await tx.execute(statement);
    });
  }

  await expect(asReader(sql`select 1 from users`)).rejects.toThrow();
  await expect(asReader(sql`select 1 from sessions`)).rejects.toThrow();
  await expect(asReader(sql`delete from trips`)).rejects.toThrow();
  await expect(
    asReader(sql`update trip_members set user_id = ${noor}`),
  ).rejects.toThrow();
});

it("reads the newest revision, and does not save a known document again", async () => {
  const renamed = { ...sample, title: "Lisbon, again" };
  expect(await importTrip(db, renamed)).toBe("revised");
  expect(await importTrip(db, renamed)).toBe("known");
  // The first document is older, as in a build of an older commit.
  expect(await importTrip(db, sample)).toBe("known");
  const [{ trip }] = await readTrips(db, mara);
  expect(trip.title).toBe("Lisbon, again");
});

it("refuses a document that is not a trip", async () => {
  const before = await db.$count(tripRevisions);
  await expect(importTrip(db, { ...sample, days: [] })).rejects.toThrow();
  expect(await db.$count(tripRevisions)).toBe(before);
});
