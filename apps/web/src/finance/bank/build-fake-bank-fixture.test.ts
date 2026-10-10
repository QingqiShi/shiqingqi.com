import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bankLinks, entries, transactions } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { buildFakeBankFixture } from "./build-fake-bank-fixture.ts";
import { createFakeBankClient } from "./lunchflow/create-fake-bank-client.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import { seedBankLink, seedUncategorised } from "./testing/seed-bank-link.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let home: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  await seedUncategorised(db, home);
  const mutations = ["2026-10-01", "2026-10-03", "2026-10-06"].map(
    (date, index) => {
      const amountMinor = -1000 - index;
      return {
        id: randomUUID(),
        name: "createTransaction",
        args: {
          id: randomUUID(),
          kind: "expense",
          date,
          amountMinor,
          categoryId: home.groceriesId,
          payeeId: home.grocerId,
          entries: [
            { id: randomUUID(), accountId: home.currentId, amountMinor },
          ],
        },
      };
    },
  );
  await applyMutations(
    db,
    home.householdId,
    { clientId: randomUUID(), mutations },
    NOW,
  );
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

async function fakeSync(now = NOW) {
  const scope = { db, householdId: home.householdId };
  const fixture = await buildFakeBankFixture(scope, "2026-10-10");
  return {
    fixture,
    results: await syncBankLinks({
      db,
      householdId: home.householdId,
      client: createFakeBankClient(fixture),
      model: null,
      now,
    }),
  };
}

describe("buildFakeBankFixture", () => {
  it("shows the Household's cash and credit accounts with bank-style rows", async () => {
    const fixture = await buildFakeBankFixture(
      { db, householdId: home.householdId },
      "2026-10-10",
    );
    expect(fixture.accounts.map((account) => account.id)).toEqual([
      `fake-${home.cardId}`,
      `fake-${home.currentId}`,
      `fake-${home.savingsId}`,
    ]);
    const rows = fixture.transactions[`fake-${home.currentId}`] ?? [];
    expect(
      rows.filter((row) => row.id.startsWith("fake-unknown-")),
    ).toHaveLength(3);
    const off = rows.filter((row) => row.id.startsWith("fake-off-"));
    expect(off).toMatchObject([{ date: "2026-10-06", amountMinor: -1003 }]);
    expect(rows.find((row) => row.date === "2026-10-01")?.description).toMatch(
      /^GROCER/,
    );
  });

  it("links the Household's own rows and adds the unknown and the 1p-off ones", async () => {
    await seedBankLink(db, home, {
      accountId: home.currentId,
      providerAccountId: `fake-${home.currentId}`,
    });

    const { results } = await fakeSync();

    expect(results).toMatchObject([{ error: null, linked: 2, created: 4 }]);
    const bankMade = await db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.source, "bank"), isNull(transactions.deletedAt)),
      );
    expect(
      bankMade
        .map((row) => [row.amountMinor, row.payeeId, row.needsReview])
        .sort(),
    ).toEqual([
      [-1003, home.grocerId, false],
      [-1299, null, true],
      [-280, null, true],
      [-485, null, true],
    ]);
    const [link] = await db.select().from(bankLinks);
    expect(link.balanceDifferenceMinor).toBe(1002);

    const second = await fakeSync(new Date("2026-10-10T18:00:00Z"));
    expect(second.results).toMatchObject([
      { error: null, linked: 0, created: 0, missing: 0 },
    ]);
  });

  it("shows a credit card the way a card statement does: purchases negative, a repayment positive", async () => {
    const purchase = randomUUID();
    await applyMutations(
      db,
      home.householdId,
      {
        clientId: randomUUID(),
        mutations: [
          {
            id: randomUUID(),
            name: "createTransaction",
            args: {
              id: purchase,
              kind: "expense",
              date: "2026-10-02",
              amountMinor: -2500,
              categoryId: home.groceriesId,
              payeeId: home.grocerId,
              entries: [
                {
                  id: randomUUID(),
                  accountId: home.cardId,
                  amountMinor: -2500,
                },
              ],
            },
          },
          {
            id: randomUUID(),
            name: "createTransaction",
            args: {
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
            },
          },
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
    expect(results).toMatchObject([{ error: null, linked: 1, created: 4 }]);
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
