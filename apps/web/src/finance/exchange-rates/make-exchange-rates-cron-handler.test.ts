import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { seedTestHousehold } from "../db/testing/seed-test-household.ts";
import { makeExchangeRatesCronHandler } from "./make-exchange-rates-cron-handler.ts";
import {
  createFakeFrankfurter,
  type FakeFrankfurter,
} from "./testing/create-fake-frankfurter.ts";

const SECRET = "cron-secret-for-tests";

let db: TestDb;
let frankfurter: FakeFrankfurter;
let configured: boolean;

beforeEach(async () => {
  db = await createTestDb();
  frankfurter = createFakeFrankfurter();
  configured = true;
  const home = await seedTestHousehold(db, "home");
  const other = await seedTestHousehold(db, "other");
  await db
    .update(accounts)
    .set({ currency: "USD" })
    .where(eq(accounts.id, home.savingsId));
  await db
    .update(accounts)
    .set({ currency: "EUR" })
    .where(eq(accounts.id, other.savingsId));
});

afterEach(async () => {
  await db.close();
});

function runCron(authorization?: string, secret: string | null = SECRET) {
  const handler = makeExchangeRatesCronHandler({
    isConfigured: () => configured,
    getDb: () => db,
    getCronSecret: () => secret ?? undefined,
    fetch: (input, init) => frankfurter.fetch(input, init),
    now: () => new Date("2026-10-22T06:00:00Z"),
  });
  return handler(
    new Request("https://qingqi.dev/api/finance/cron/exchange-rates", {
      headers: authorization ? { Authorization: authorization } : {},
    }),
  );
}

describe("makeExchangeRatesCronHandler", () => {
  it("refuses a request without the secret, with a wrong one, or when no secret is set", async () => {
    const statuses = [
      (await runCron()).status,
      (await runCron("Bearer wrong-secret")).status,
      (await runCron(`Bearer ${SECRET}`, null)).status,
    ];

    expect(statuses).toEqual([401, 401, 401]);
    expect(frankfurter.requests).toEqual([]);
  });

  it("answers 503 when Finance has no database", async () => {
    configured = false;

    const response = await runCron(`Bearer ${SECRET}`);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "not-configured" });
  });

  it("refreshes the pairs of every Household and sends the totals", async () => {
    frankfurter.rates.set("USD/GBP", 0.75);
    frankfurter.failures.set("EUR/GBP", 500);

    const response = await runCron(`Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ pairs: 2, added: 1, failed: 1 });
    expect(frankfurter.requests.toSorted()).toEqual([
      "https://api.frankfurter.dev/v1/2026-10-22..2026-10-22?base=EUR&symbols=GBP",
      "https://api.frankfurter.dev/v1/2026-10-22..2026-10-22?base=USD&symbols=GBP",
    ]);
  });
});
