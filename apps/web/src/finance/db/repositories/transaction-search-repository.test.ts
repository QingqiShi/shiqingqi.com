import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedBankLink } from "../../bank/testing/seed-bank-link.ts";
import { applyMutations } from "../../sync/apply-mutations.ts";
import { bankTransactions, transactions } from "../schema.ts";
import { createTestDb, type TestDb } from "../testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../testing/seed-test-household.ts";
import { withHousehold } from "../with-household.ts";
import {
  transactionSearchRepository,
  type TransactionSearch,
} from "./transaction-search-repository.ts";

const NOW = new Date("2026-10-10T12:00:00Z");

let db: TestDb;
let home: SeededHousehold;
let other: SeededHousehold;
let linkId: string;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  other = await seedTestHousehold(db, "other");
  linkId = await seedBankLink(db, home, {
    accountId: home.currentId,
    providerAccountId: "acc-current",
  });
});

afterEach(async () => {
  await db.close();
});

async function expense(
  household: SeededHousehold,
  fields: {
    date: string;
    amountMinor: number;
    note?: string;
    payeeId?: string;
    accountId?: string;
    labelledBy?: "member" | "ai";
    needsReview?: boolean;
    bankText?: string;
  },
) {
  const id = randomUUID();
  await applyMutations(
    db,
    household.householdId,
    {
      clientId: randomUUID(),
      mutations: [
        {
          id: randomUUID(),
          name: "createTransaction",
          args: {
            id,
            kind: "expense",
            date: fields.date,
            amountMinor: fields.amountMinor,
            categoryId: household.groceriesId,
            payeeId: fields.payeeId ?? null,
            note: fields.note ?? "",
            needsReview: fields.needsReview ?? false,
            entries: [
              {
                id: randomUUID(),
                accountId: fields.accountId ?? household.currentId,
                amountMinor: fields.amountMinor,
              },
            ],
            tagIds: [household.trainTagId],
          },
        },
      ],
    },
    NOW,
  );
  await db
    .update(transactions)
    .set({ labelledBy: fields.labelledBy ?? "member" })
    .where(eq(transactions.id, id));
  if (fields.bankText) {
    await db.insert(bankTransactions).values({
      id: randomUUID(),
      householdId: household.householdId,
      linkId,
      providerTxId: randomUUID(),
      date: fields.date,
      amountMinor: fields.amountMinor,
      currency: "GBP",
      merchant: fields.bankText,
      description: "CARD PAYMENT",
      raw: {},
      state: "matched",
      transactionId: id,
      version: 0,
    });
  }
  return id;
}

function search(household: SeededHousehold, input: TransactionSearch) {
  return withHousehold(db, household.householdId, (scope) =>
    transactionSearchRepository.search(scope, input),
  );
}

describe("transactionSearchRepository", () => {
  it("needs every word, and matches the Payee name and the note", async () => {
    const lunch = await expense(home, {
      date: "2026-10-05",
      amountMinor: -900,
      payeeId: home.grocerId,
      note: "Team lunch",
    });
    await expense(home, {
      date: "2026-10-05",
      amountMinor: -900,
      note: "lunch",
    });

    expect(
      (await search(home, { text: "grocer lunch" })).map((row) => row.id),
    ).toEqual([lunch]);
  });

  it("filters by account, amount, date and kind, and leaves out rows in Review", async () => {
    const card = await expense(home, {
      date: "2026-10-02",
      amountMinor: -2550,
      accountId: home.cardId,
    });
    await expense(home, { date: "2026-10-02", amountMinor: -2550 });
    await expense(home, {
      date: "2026-10-03",
      amountMinor: -2550,
      accountId: home.cardId,
      needsReview: true,
    });
    await expense(home, {
      date: "2026-08-01",
      amountMinor: -2550,
      accountId: home.cardId,
    });
    await expense(home, {
      date: "2026-10-02",
      amountMinor: -99_00,
      accountId: home.cardId,
    });

    const found = await search(home, {
      accountId: home.cardId,
      amountMin: 25,
      amountMax: 26,
      dateFrom: "2026-09-01",
      dateTo: "2026-10-31",
      kind: "expense",
    });

    expect(found.map((row) => row.id)).toEqual([card]);
    expect(await search(home, { kind: "income" })).toEqual([]);
  });

  it("reads one Household only", async () => {
    await expense(other, { date: "2026-10-01", amountMinor: -100, note: "x" });

    expect(await search(home, { text: "x" })).toEqual([]);
  });
});
