import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  bankBalances,
  bankKeptTransactions,
  bankLinks,
  bankTransactions,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { BalanceCheckNotFoundError, balanceCheck } from "./balance-check.ts";
import type { ProviderBalance } from "./lunchflow/types.ts";
import { processBankRows } from "./process-bank-rows.ts";
import { seedBankLink, seedUncategorised } from "./testing/seed-bank-link.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const CLIENT = "00000000-0000-4000-8000-00000000c003";

let db: TestDb;
let home: SeededHousehold;
let linkId: string;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  linkId = await seedBankLink(db, home, {
    accountId: home.currentId,
    providerAccountId: "acc-current",
  });
});

afterEach(async () => {
  await db.close();
});

async function push(mutations: ReturnType<typeof mutation>[]) {
  const result = await applyMutations(
    db,
    home.householdId,
    { clientId: CLIENT, mutations },
    NOW,
  );
  expect(result.rejected).toEqual([]);
}

/** A posted expense on the current account; returns its Transaction and Entry ids. */
async function addExpense(
  date: string,
  extra: { status?: "posted" | "expected" } = {},
) {
  const transactionId = randomUUID();
  const entryId = randomUUID();
  await push([
    mutation("createTransaction", {
      id: transactionId,
      kind: "expense",
      status: extra.status,
      date,
      categoryId: home.groceriesId,
      payeeId: home.grocerId,
      memberId: home.memberId,
      entries: [{ id: entryId, accountId: home.currentId, amountMinor: -1000 }],
    }),
  ]);
  return { transactionId, entryId };
}

async function addBankRow(
  date: string,
  fields: {
    state?: "new" | "matched" | "missing" | "ignored";
    transactionId?: string | null;
    amountMinor?: number;
    currency?: string;
  } = {},
) {
  await db.insert(bankTransactions).values({
    id: randomUUID(),
    householdId: home.householdId,
    linkId,
    providerTxId: randomUUID(),
    date,
    amountMinor: fields.amountMinor ?? -1000,
    currency: fields.currency ?? "GBP",
    description: "SHOP",
    raw: {},
    state: fields.state ?? "new",
    transactionId: fields.transactionId ?? null,
    version: 0,
  });
}

async function setLink(fields: Partial<typeof bankLinks.$inferInsert>) {
  await db.update(bankLinks).set(fields).where(eq(bankLinks.id, linkId));
}

async function link() {
  const [row] = await db
    .select()
    .from(bankLinks)
    .where(eq(bankLinks.id, linkId));
  return row;
}

function refresh(balance?: ProviderBalance) {
  return runServerWrite(db, home.householdId, NOW, (context) =>
    balanceCheck.refresh(
      context,
      balance && { linkId, fetchedAt: NOW, balance },
    ),
  );
}

async function unbackedEntryIds() {
  const entries = await withHousehold(db, home.householdId, (scope) =>
    balanceCheck.unbackedEntries(scope, linkId),
  );
  return entries.map((entry) => entry.id);
}

function keep(transactionId: string) {
  return runServerWrite(db, home.householdId, NOW, (context) =>
    balanceCheck.keep(context, linkId, transactionId),
  );
}

describe("balanceCheck.refresh", () => {
  it("stores the bank balance with the link's sign, dated today, and keeps it in the history", async () => {
    await setLink({ signMultiplier: -1 });

    await refresh({ amountMinor: 500, currency: "GBP" });

    expect(await link()).toMatchObject({
      bankBalanceMinor: -500,
      bankBalanceOn: "2026-10-10",
    });
    expect(
      await db
        .select({
          amountMinor: bankBalances.amountMinor,
          currency: bankBalances.currency,
        })
        .from(bankBalances),
    ).toEqual([{ amountMinor: 500, currency: "GBP" }]);
  });

  it("stores no bank balance when the bank answers in another currency", async () => {
    await setLink({ bankBalanceMinor: 100, bankBalanceOn: "2026-10-01" });

    await refresh({ amountMinor: 500, currency: "USD" });

    expect(await link()).toMatchObject({
      bankBalanceMinor: null,
      bankBalanceOn: "2026-10-10",
    });
    expect(await db.$count(bankBalances)).toBe(1);
  });

  it("counts only the usable new rows as waiting", async () => {
    await addBankRow("2026-10-08");
    await addBankRow("2026-10-08", { amountMinor: 0 });
    await addBankRow("2026-10-08", { currency: "USD" });
    const { transactionId } = await addExpense("2026-10-08");
    await addBankRow("2026-10-08", { state: "matched", transactionId });
    await addBankRow("2026-10-08", { state: "missing" });
    await addBankRow("2026-10-08", { state: "ignored" });

    const { result } = await refresh();

    expect(result.get(linkId)).toBe(1);
    expect((await link()).bankRowsWaiting).toBe(true);
  });

  it("clears waiting once the rows are matched", async () => {
    await addBankRow("2026-10-08");
    await refresh();
    expect((await link()).bankRowsWaiting).toBe(true);
    await db.update(bankTransactions).set({ state: "matched" });

    const { result } = await refresh();

    expect(result.get(linkId)).toBe(0);
    expect((await link()).bankRowsWaiting).toBe(false);
  });

  it("is run by the AI step, so waiting clears even when the step wrote nothing", async () => {
    await seedUncategorised(db, home);
    await setLink({ bankRowsWaiting: true });

    await processBankRows({
      db,
      householdId: home.householdId,
      model: null,
      now: NOW,
      deadline: new Date(Date.now() + 60_000),
    });

    expect((await link()).bankRowsWaiting).toBe(false);
  });

  it("moves no clock when nothing changed", async () => {
    await addBankRow("2026-10-08");
    const first = await refresh({ amountMinor: 500, currency: "GBP" });

    const second = await refresh();

    expect(second.clock).toBe(first.clock);
  });
});

describe("balanceCheck.unbackedEntries", () => {
  beforeEach(async () => {
    await setLink({ bankBalanceMinor: 0, bankBalanceOn: "2026-10-08" });
  });

  it("lists only the posted Entries after the latest Valuation, up to the bank balance's day", async () => {
    await addBankRow("2026-09-01", { state: "ignored" });
    await addExpense("2026-10-01");
    await push([
      mutation("putValuation", {
        id: randomUUID(),
        accountId: home.currentId,
        on: "2026-10-02",
        amountMinor: 10_000,
      }),
    ]);
    await addExpense("2026-10-02");
    const listed = await addExpense("2026-10-03");
    await addExpense("2026-10-04", { status: "expected" });
    const deleted = await addExpense("2026-10-05");
    await push([mutation("deleteTransaction", { id: deleted.transactionId })]);
    await addExpense("2026-10-09");

    expect(await unbackedEntryIds()).toEqual([listed.entryId]);
  });

  it("leaves out each Entry whose Transaction a matched bank row backs", async () => {
    const backed = await addExpense("2026-10-01");
    const other = await addExpense("2026-10-02");
    await addBankRow("2026-10-01", {
      state: "matched",
      transactionId: backed.transactionId,
    });

    expect(await unbackedEntryIds()).toEqual([other.entryId]);
  });

  it("lists a duplicate: a second Transaction for the bank row that backs the first", async () => {
    const backed = await addExpense("2026-10-03");
    const copy = await addExpense("2026-10-03");
    await addBankRow("2026-10-03", {
      state: "matched",
      transactionId: backed.transactionId,
    });

    expect(await unbackedEntryIds()).toEqual([copy.entryId]);
  });

  it("lists an Entry whose bank row the bank stopped returning", async () => {
    const gone = await addExpense("2026-10-03");
    await addBankRow("2026-10-03", {
      state: "missing",
      transactionId: gone.transactionId,
    });

    expect(await unbackedEntryIds()).toEqual([gone.entryId]);
  });

  it("leaves out each Entry whose Transaction a Member kept", async () => {
    const kept = await addExpense("2026-10-02");
    const other = await addExpense("2026-10-03");
    await addBankRow("2026-10-01", { state: "ignored" });
    await db.insert(bankKeptTransactions).values({
      householdId: home.householdId,
      linkId,
      transactionId: kept.transactionId,
    });

    expect(await unbackedEntryIds()).toEqual([other.entryId]);
  });

  it("lists oldest first", async () => {
    const newer = await addExpense("2026-10-05");
    const older = await addExpense("2026-10-02");
    await addBankRow("2026-10-01", { state: "ignored" });

    expect(await unbackedEntryIds()).toEqual([older.entryId, newer.entryId]);
  });

  it("leaves out Entries older than the link's first bank row", async () => {
    await addExpense("2026-09-30");
    const inHistory = await addExpense("2026-10-01");
    await addBankRow("2026-10-01", { state: "ignored" });

    expect(await unbackedEntryIds()).toEqual([inHistory.entryId]);
  });

  it("lists none when the link has no bank rows", async () => {
    await addExpense("2026-10-01");

    expect(await unbackedEntryIds()).toEqual([]);
  });

  it("refuses a Bank link that is gone", async () => {
    await setLink({ deletedAt: NOW });

    await expect(unbackedEntryIds()).rejects.toBeInstanceOf(
      BalanceCheckNotFoundError,
    );
  });
});

describe("balanceCheck.keep", () => {
  beforeEach(async () => {
    await setLink({ bankBalanceMinor: 0, bankBalanceOn: "2026-10-08" });
  });

  it("refuses a Transaction that is not unbacked, keeps an unbacked one with a new link version, and lists it again on unkeep", async () => {
    const backed = await addExpense("2026-10-02");
    await addBankRow("2026-10-02", {
      state: "matched",
      transactionId: backed.transactionId,
    });
    const real = await addExpense("2026-10-03");
    const before = await link();

    for (const transactionId of [backed.transactionId, randomUUID()]) {
      await expect(keep(transactionId)).rejects.toBeInstanceOf(
        BalanceCheckNotFoundError,
      );
    }
    await keep(real.transactionId);

    expect(await unbackedEntryIds()).toEqual([]);
    expect((await link()).version).toBeGreaterThan(before.version);

    await runServerWrite(db, home.householdId, NOW, (context) =>
      balanceCheck.unkeep(context, linkId, real.transactionId),
    );

    expect(await unbackedEntryIds()).toEqual([real.entryId]);
  });
});
