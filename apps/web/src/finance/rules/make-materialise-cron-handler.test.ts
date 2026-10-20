import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { seedTestHousehold } from "../db/testing/seed-test-household.ts";
import { makeMaterialiseCronHandler } from "./make-materialise-cron-handler.ts";

const SECRET = "cron-secret-for-tests";
const URL = "https://qingqi.dev/api/finance/cron/materialise";

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
  await seedTestHousehold(db, "home");
  await seedTestHousehold(db, "other");
});

afterEach(async () => {
  await db.close();
});

describe("makeMaterialiseCronHandler", () => {
  it("materialises every household with the right secret", async () => {
    const handler = makeMaterialiseCronHandler({
      isConfigured: () => true,
      getDb: () => db,
      getCronSecret: () => SECRET,
      now: () => new Date("2026-10-10T02:00:00Z"),
    });
    const response = await handler(
      new Request(URL, { headers: { Authorization: `Bearer ${SECRET}` } }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ households: 2, written: 0 });
  });
});
