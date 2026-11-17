import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, expect, it } from "vitest";
import { users } from "#src/db/auth-schema.ts";
import { aiRuns, schema } from "#src/db/schema.ts";
import { TRIPS_MIGRATIONS_FOLDER } from "#src/db/trips-migrations-folder.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { writeTrips } from "#src/trips/write-trips.ts";
import { emptyUse } from "./ask-model.ts";
import { logAiRun, type AiRun } from "./log-ai-run.ts";

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

const NEW_TRIP = {
  title: "Three days in Rome",
  firstDate: "2027-03-01",
  days: 3,
  timeZone: "Europe/Rome",
  language: "en",
} as const;

function edit(tripId: string | null): AiRun {
  return {
    tripId,
    kind: "edit",
    model: "a-model",
    status: "ok",
    use: { ...emptyUse(), rounds: 1, inputTokens: 900, outputTokens: 120 },
    durationMs: 2400,
  };
}

function runsOf(userId: string) {
  return db
    .select({ tripId: aiRuns.tripId, userId: aiRuns.userId })
    .from(aiRuns)
    .where(eq(aiRuns.userId, userId));
}

it("lets the app write a run of the user, keeps the trip only for a member, and shows the rows to no user", async () => {
  const owner = await addUser();
  const stranger = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);

  await logAiRun(db, owner, edit(tripId));
  await logAiRun(db, stranger, edit(tripId));
  expect(await runsOf(owner)).toEqual([{ tripId, userId: owner }]);
  expect(await runsOf(stranger)).toEqual([{ tripId: null, userId: stranger }]);

  for (const statement of [
    sql`select * from ai_runs`,
    sql`insert into ai_runs (kind, model, status, rounds, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, duration_ms) values ('edit', 'm', 'ok', 1, 1, 1, 0, 0, 1)`,
    sql`update ai_runs set rounds = 0`,
    sql`delete from ai_runs`,
  ]) {
    await expect(
      asViewer(db, owner, (tx) => tx.execute(statement)),
    ).rejects.toThrow();
  }

  const before = await db.$count(aiRuns);
  await asViewer(db, null, (tx) =>
    tx.execute(
      sql`select public.trips_log_ai_run(null, 'edit', 'm', 'ok', 1, 1, 1, 0, 0, 1)`,
    ),
  );
  expect(await db.$count(aiRuns)).toBe(before);
});

it("keeps a run when its trip and its user go", async () => {
  const owner = await addUser();
  const tripId = await writeTrips.create(db, owner, NEW_TRIP);
  await logAiRun(db, owner, edit(tripId));
  const [{ id }] = await db
    .select({ id: aiRuns.id })
    .from(aiRuns)
    .where(eq(aiRuns.userId, owner));

  await db.execute(sql`select public.trips_forget_user(${owner}::uuid)`);
  await db.delete(users).where(eq(users.id, owner));

  const [kept] = await db
    .select({
      tripId: aiRuns.tripId,
      userId: aiRuns.userId,
      rounds: aiRuns.rounds,
    })
    .from(aiRuns)
    .where(eq(aiRuns.id, id));
  expect(kept).toEqual({ tripId: null, userId: null, rounds: 1 });
});
