import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { accounts, bankLinks, entries, transactions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { buildFakeBankFixture } from "./build-fake-bank-fixture.ts";
import { createFakeBankClient } from "./lunchflow/create-fake-bank-client.ts";
import { processBankRows } from "./process-bank-rows.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import { seedBankLink, seedUncategorised } from "./testing/seed-bank-link.ts";

const NOW = new Date("2026-10-10T12:00:00Z");

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  await seedUncategorised(db, home);
  const mutations = ["2026-10-01", "2026-10-03", "2026-10-06"].map(
    (date, index) => {
      const amountMinor = -1000 - index;
      return mutation("createTransaction", {
        id: randomUUID(),
        kind: "expense",
        date,
        amountMinor,
        categoryId: home.groceriesId,
        payeeId: home.grocerId,
        entries: [{ id: randomUUID(), accountId: home.currentId, amountMinor }],
      });
    },
  );
  await applyMutations(
    db,
    home.householdId,
    { clientId: randomUUID(), mutations },
    NOW,
  );
});

afterEach(async () => {
  await db.close();
});

function fakeFixture(today: string) {
  return withHousehold(db, home.householdId, (scope) =>
    buildFakeBankFixture(scope, today),
  );
}

async function fakeSync(now = NOW) {
  const fixture = await fakeFixture("2026-10-10");
  const results = await syncBankLinks({
    db,
    householdId: home.householdId,
    client: createFakeBankClient(fixture),
    now,
  });
  await processBankRows({
    db,
    householdId: home.householdId,
    model: null,
    now,
    deadline: new Date(Date.now() + 60_000),
  });
  return { fixture, results };
}

describe("buildFakeBankFixture", () => {
  it("puts the accounts one Member holds at one institution in one Bank login", async () => {
    await db
      .update(accounts)
      .set({ institution: "Chase" })
      .where(eq(accounts.householdId, home.householdId));
    await db
      .update(accounts)
      .set({ ownerMemberId: home.partnerId })
      .where(eq(accounts.id, home.savingsId));

    const fixture = await fakeFixture("2026-10-10");
    const loginOf = new Map(
      fixture.accounts.map((account) => [account.id, account.bankLoginId]),
    );
    expect(loginOf.get(`fake-${home.cardId}`)).toBe(
      loginOf.get(`fake-${home.currentId}`),
    );
    expect(loginOf.get(`fake-${home.savingsId}`)).not.toBe(
      loginOf.get(`fake-${home.currentId}`),
    );
  });

  it("shows a credit card the way a card statement does: purchases negative, a repayment positive", async () => {
    await applyMutations(
      db,
      home.householdId,
      {
        clientId: randomUUID(),
        mutations: [
          mutation("createTransaction", {
            id: randomUUID(),
            kind: "expense",
            date: "2026-10-02",
            amountMinor: -2500,
            categoryId: home.groceriesId,
            payeeId: home.grocerId,
            entries: [
              { id: randomUUID(), accountId: home.cardId, amountMinor: -2500 },
            ],
          }),
          mutation("createTransaction", {
            id: randomUUID(),
            kind: "transfer",
            date: "2026-10-05",
            amountMinor: 0,
            categoryId: null,
            payeeId: null,
            entries: [
              {
                id: randomUUID(),
                accountId: home.currentId,
                amountMinor: -2000,
              },
              { id: randomUUID(), accountId: home.cardId, amountMinor: 2000 },
            ],
          }),
        ],
      },
      NOW,
    );
    await seedBankLink(db, home, {
      accountId: home.cardId,
      providerAccountId: `fake-${home.cardId}`,
    });

    const { fixture, results } = await fakeSync();

    const card = fixture.transactions[`fake-${home.cardId}`] ?? [];
    expect(
      card
        .filter((row) => !row.id.startsWith("fake-unknown-"))
        .map((row) => [row.date, row.amountMinor]),
    ).toEqual([
      ["2026-10-02", -2501],
      ["2026-10-05", 2000],
    ]);
    expect(
      card.every(
        (row) => !row.id.startsWith("fake-unknown-") || row.amountMinor < 0,
      ),
    ).toBe(true);
    expect(results).toMatchObject([{ error: null, linked: 1, pending: 4 }]);
    const cardEntries = await db
      .select({ amountMinor: entries.amountMinor, kind: transactions.kind })
      .from(entries)
      .innerJoin(transactions, eq(transactions.id, entries.transactionId))
      .where(
        and(
          eq(entries.accountId, home.cardId),
          eq(transactions.source, "bank"),
        ),
      );
    expect(cardEntries).toHaveLength(4);
    expect(
      cardEntries.every(
        (entry) => entry.kind === "expense" && entry.amountMinor < 0,
      ),
    ).toBe(true);
    const [link] = await db.select().from(bankLinks);
    expect(link.bankBalanceMinor).toBeLessThan(0);
  });
});
