import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { createFakeBankClient } from "./lunchflow/create-fake-bank-client.ts";
import { makeBankSyncHandler } from "./make-bank-sync-handler.ts";
import { seedBankLink, seedUncategorised } from "./testing/seed-bank-link.ts";
import type { BankConnection } from "./types.ts";

const SECRET = "cron-secret";
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let home: SeededHousehold;
let other: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db, "home");
  other = await seedTestHousehold(db, "other");
  await seedUncategorised(db, home);
  await seedBankLink(db, home, {
    accountId: home.currentId,
    providerAccountId: "p1",
  });
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function handler() {
  return makeBankSyncHandler({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => SECRET,
    getBankClient: (scope): Promise<BankConnection> =>
      Promise.resolve(
        scope.householdId === other.householdId
          ? { status: "not_connected" }
          : {
              status: "connected",
              mode: "fake",
              client: createFakeBankClient({
                accounts: [
                  {
                    id: "p1",
                    connectionId: "c",
                    name: "Current",
                    institution: "Bank",
                    institutionLogo: null,
                    provider: "fake",
                    currency: "GBP",
                    status: "ACTIVE",
                  },
                ],
                transactions: {
                  p1: [
                    {
                      id: "t1",
                      date: "2026-10-09",
                      amountMinor: -500,
                      currency: "GBP",
                      merchant: "",
                      description: "SHOP",
                      raw: {},
                    },
                  ],
                },
                balances: { p1: { amountMinor: -500, currency: "GBP" } },
              }),
            },
      ),
    getModel: () => null,
    now: () => new Date("2026-10-10T12:00:00Z"),
  });
}

function cronRequest(secret?: string) {
  return new Request("https://qingqi.dev/api/finance/cron/bank-sync", {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
}

describe("makeBankSyncHandler", () => {
  it("refuses a request without the cron secret", async () => {
    expect((await handler()(cronRequest())).status).toBe(401);
    expect((await handler()(cronRequest("wrong"))).status).toBe(401);
  });

  it("syncs every connected Household", async () => {
    const response = await handler()(cronRequest(SECRET));
    expect(await response.json()).toEqual({
      households: 1,
      links: 1,
      failed: 0,
      created: 1,
    });
  });
});
