import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { makeInstitutionIconsCronHandler } from "./make-institution-icons-cron-handler.ts";

const SECRET = "cron-secret-for-tests";
const DAY_MS = 24 * 60 * 60 * 1000;
const BUDGET_MS = 60_000;
const START = new Date("2026-10-14T03:00:00Z");

/** The first test database of a file runs the migrations, which is slow on a busy machine. */
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let now: Date;
let guessed: string[];

beforeEach(async () => {
  db = await createTestDb();
  now = START;
  guessed = [];
  await nameInstitution(await seedTestHousehold(db, "home"), "Alpha Bank");
  await nameInstitution(await seedTestHousehold(db, "other"), "Beta Bank");
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

async function nameInstitution(seeded: SeededHousehold, institution: string) {
  await applyMutations(
    db,
    seeded.householdId,
    {
      clientId: randomUUID(),
      mutations: [
        {
          id: randomUUID(),
          name: "upsertAccount",
          args: { id: seeded.currentId, institution },
        },
      ],
    },
    now,
  );
}

async function runCron() {
  const handler = makeInstitutionIconsCronHandler({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => SECRET,
    now: () => now,
    budgetMs: BUDGET_MS,
    callTimeoutMs: 50,
    guessDomain: (name) => {
      guessed.push(name);
      now = new Date(now.getTime() + BUDGET_MS);
      return new Promise<string | null>(() => {});
    },
    fetchIcon: () => Promise.resolve(null),
  });
  const response = await handler(
    new Request("https://qingqi.dev/api/finance/cron/institution-icons", {
      headers: { Authorization: `Bearer ${SECRET}` },
    }),
  );
  const totals: unknown = await response.json();
  return totals;
}

describe("makeInstitutionIconsCronHandler", () => {
  it("stops a run when its time is up, and starts the next day's run at the Household that run left out", async () => {
    expect(await runCron()).toMatchObject({ households: 1, failed: 1 });
    expect(guessed).toHaveLength(1);

    now = new Date(START.getTime() + DAY_MS);
    expect(await runCron()).toMatchObject({ households: 1, failed: 1 });

    expect(guessed.toSorted()).toEqual(["Alpha Bank", "Beta Bank"]);
  });
});
