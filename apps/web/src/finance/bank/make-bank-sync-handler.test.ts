import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bankTransactions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import {
  createFakeBankClient,
  type FakeBankFixture,
} from "./lunchflow/create-fake-bank-client.ts";
import { makeBankProvider } from "./make-bank-provider.ts";
import { makeBankSyncHandler } from "./make-bank-sync-handler.ts";
import {
  seedBankLink,
  seedCredential,
  seedUncategorised,
} from "./testing/seed-bank-link.ts";

const SECRET = "cron-secret";
const DB_HOOK_TIMEOUT = 60_000;
const CREDENTIAL_KEY = new Uint8Array(randomBytes(32));

let db: TestDb;
let home: SeededHousehold;
let other: SeededHousehold;
let idle: SeededHousehold;
let clientsMade: string[];

/** A fake bank with one account, `p1`, and one transaction for each id. */
function fixture(transactionIds: string[]): FakeBankFixture {
  return {
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
      p1: transactionIds.map((id) => ({
        id,
        date: "2026-10-09",
        amountMinor: -500,
        currency: "GBP",
        merchant: "",
        description: "SHOP",
        raw: {},
      })),
    },
    balances: { p1: { amountMinor: -500, currency: "GBP" } },
  };
}

const banks: Partial<Record<string, FakeBankFixture>> = {
  "home-lunch-flow-key": fixture(["h1"]),
  "other-lunch-flow-key": fixture(["o1", "o2"]),
};

beforeEach(async () => {
  db = await createTestDb();
  clientsMade = [];
  home = await seedTestHousehold(db, "home");
  other = await seedTestHousehold(db, "other");
  idle = await seedTestHousehold(db, "idle");
  for (const household of [home, other, idle]) {
    await seedUncategorised(db, household);
    await seedBankLink(db, household, {
      accountId: household.currentId,
      providerAccountId: "p1",
    });
  }
  await seedCredential(db, home, "home-lunch-flow-key", CREDENTIAL_KEY);
  await seedCredential(db, other, "other-lunch-flow-key", CREDENTIAL_KEY);
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function handler() {
  const provider = makeBankProvider({
    fake: () => false,
    credentialKey: () => CREDENTIAL_KEY,
    createClient: (apiKey) => {
      clientsMade.push(apiKey);
      const bank = banks[apiKey];
      if (!bank) throw new Error(`No bank takes ${apiKey}`);
      return createFakeBankClient(bank);
    },
  });
  return makeBankSyncHandler({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => SECRET,
    getBankClient: provider.getBankClient,
    getModel: () => null,
    now: () => new Date("2026-10-10T12:00:00Z"),
  });
}

function cronRequest(secret?: string) {
  return new Request("https://qingqi.dev/api/finance/cron/bank-sync", {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
}

async function bankRowsOf(household: SeededHousehold) {
  const rows = await db
    .select({ providerTxId: bankTransactions.providerTxId })
    .from(bankTransactions)
    .where(eq(bankTransactions.householdId, household.householdId));
  return rows.map((row) => row.providerTxId).sort();
}

describe("makeBankSyncHandler", () => {
  it("refuses a request without the cron secret", async () => {
    expect((await handler()(cronRequest())).status).toBe(401);
    expect((await handler()(cronRequest("wrong"))).status).toBe(401);
  });

  it("syncs each Household with its own API key, and skips one without a key", async () => {
    const response = await handler()(cronRequest(SECRET));

    expect(await response.json()).toEqual({
      households: 2,
      links: 2,
      failed: 0,
      created: 3,
    });
    expect(clientsMade.sort()).toEqual([
      "home-lunch-flow-key",
      "other-lunch-flow-key",
    ]);
    expect(await bankRowsOf(home)).toEqual(["h1"]);
    expect(await bankRowsOf(other)).toEqual(["o1", "o2"]);
    expect(await bankRowsOf(idle)).toEqual([]);
  });
});
