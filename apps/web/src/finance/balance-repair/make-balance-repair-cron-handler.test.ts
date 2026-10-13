import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BalanceDrift } from "../db/repositories/balance-check-repository.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { insertTestExpense } from "../db/testing/insert-test-expense.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { makeBalanceRepairCronHandler } from "./make-balance-repair-cron-handler.ts";

const SECRET = "cron-secret-for-tests";
const URL = "https://qingqi.dev/api/finance/cron/balance-repair";

/** The first test database of a file runs the migrations, which is slow on a busy machine. */
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let home: SeededHousehold;
let drifts: { householdId: string; drift: BalanceDrift }[];

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db, "home");
  await seedTestHousehold(db, "other");
  drifts = [];
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function handler(secret: string | undefined = SECRET) {
  return makeBalanceRepairCronHandler({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => secret,
    now: () => new Date("2026-10-13T03:30:00Z"),
    onDrift: (householdId, drift) => drifts.push({ householdId, drift }),
  });
}

function request(authorization?: string) {
  return new Request(URL, {
    headers:
      authorization === undefined ? {} : { Authorization: authorization },
  });
}

describe("makeBalanceRepairCronHandler", () => {
  it("refuses a request without the cron secret", async () => {
    const responses = await Promise.all([
      handler()(request()),
      handler()(request("Bearer wrong")),
      handler()(request(SECRET)),
      handler(undefined)(request("Bearer undefined")),
    ]);
    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401,
    ]);
  });

  it("checks every household and reports each drift with its household", async () => {
    await insertTestExpense(db, home, home.currentId, "2026-10-01", -1_200);

    const response = await handler()(request(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      households: 2,
      checked: 1,
      drifts: 1,
      failed: 0,
    });
    expect(drifts).toEqual([
      {
        householdId: home.householdId,
        drift: {
          accountId: home.currentId,
          day: "2026-10-01",
          expectedMinor: -1_200,
          storedMinor: null,
          wrongDays: 1,
        },
      },
    ]);
  });
});
