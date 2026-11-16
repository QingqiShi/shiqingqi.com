import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { schema, tripRevisions } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { importTrip } from "./import-trip.ts";
import { readTrips } from "./read-trips.ts";
import sample from "./testing/sample-trip.json";

// The gates read their passwords when the module loads: the sample trip has
// one here, and the GB trip has a gate with no password.
vi.hoisted(() => {
  process.env.SITE_PASSWORD_SAMPLE = "test";
  delete process.env.SITE_PASSWORD_GB;
});

let client: PGlite;
let db: TripsDb;

beforeAll(async () => {
  client = await PGlite.create();
  db = drizzle({ client, schema });
  await migrate(drizzle({ client }), {
    migrationsFolder: TRIPS_MIGRATIONS_FOLDER,
  });
  await importTrip(db, sample);
});

afterAll(() => client.close());

it("refuses a trip with no gate, and a trip whose gate has no password", async () => {
  await importTrip(db, { ...sample, id: "no-gate", slug: "no-gate" });
  await importTrip(db, { ...sample, id: "gb", slug: "gb" });
  expect((await readTrips(db)).map((trip) => trip.slug)).toEqual([sample.slug]);
});

it("reads the newest revision, and does not save a known document again", async () => {
  const renamed = { ...sample, title: "Lisbon, again" };
  expect(await importTrip(db, renamed)).toBe("revised");
  expect(await importTrip(db, renamed)).toBe("known");
  // The first document is older, as in a build of an older commit.
  expect(await importTrip(db, sample)).toBe("known");
  const [trip] = await readTrips(db);
  expect(trip.title).toBe("Lisbon, again");
});

it("refuses a document that is not a trip", async () => {
  const before = await db.$count(tripRevisions);
  await expect(importTrip(db, { ...sample, days: [] })).rejects.toThrow();
  expect(await db.$count(tripRevisions)).toBe(before);
});
