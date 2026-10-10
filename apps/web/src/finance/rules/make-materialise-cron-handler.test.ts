import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { seedTestHousehold } from "../db/testing/seed-test-household.ts";
import { makeMaterialiseCronHandler } from "./make-materialise-cron-handler.ts";

const SECRET = "cron-secret-for-tests";
const URL = "https://qingqi.dev/api/finance/cron/materialise";

/** The first test database of a file runs the migrations, which is slow on a busy machine. */
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
  await seedTestHousehold(db, "home");
  await seedTestHousehold(db, "other");
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function handler(secret: string | undefined = SECRET) {
  return makeMaterialiseCronHandler({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => secret,
    now: () => new Date("2026-10-10T02:00:00Z"),
  });
}

function request(authorization?: string) {
  return new Request(URL, {
    headers:
      authorization === undefined ? {} : { Authorization: authorization },
  });
}

describe("makeMaterialiseCronHandler", () => {
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

  it("materialises every household with the right secret", async () => {
    const response = await handler()(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ households: 2, written: 0 });
  });
});
