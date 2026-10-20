import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { valuationRepository } from "../db/repositories/valuation-repository.ts";
import {
  bankLinks,
  bankTransactions,
  entries,
  transactions,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { mutation } from "../db/testing/mutation.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { withHousehold } from "../db/with-household.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { ensureInTransitAccount } from "./ensure-in-transit-account.ts";
import {
  createFakeBankClient,
  type FakeBankFixture,
} from "./lunchflow/create-fake-bank-client.ts";
import { processBankRows } from "./process-bank-rows.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import {
  providerAccount,
  providerRow,
  seedBankLink,
  seedUncategorised,
} from "./testing/seed-bank-link.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const NEXT_DAY = new Date("2026-10-11T12:00:00Z");
const DAY_AFTER = new Date("2026-10-12T12:00:00Z");
const THIRD_DAY = new Date("2026-10-13T12:00:00Z");
const CLIENT = "00000000-0000-4000-8000-00000000c001";

let db: TestDb;
let home: SeededHousehold;
let uncategorised: { expense: string; income: string };
let currentLinkId: string;
let cardLinkId: string;
let fixture: FakeBankFixture;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  uncategorised = await seedUncategorised(db, home);
  currentLinkId = await seedBankLink(db, home, {
    accountId: home.currentId,
    providerAccountId: "acc-current",
  });
  cardLinkId = await seedBankLink(db, home, {
    accountId: home.cardId,
    providerAccountId: "acc-card",
  });
  fixture = {
    accounts: [providerAccount("acc-current"), providerAccount("acc-card")],
    transactions: { "acc-current": [], "acc-card": [] },
    balances: {
      "acc-current": { amountMinor: 0, currency: "GBP" },
      "acc-card": { amountMinor: 0, currency: "GBP" },
    },
  };
});

afterEach(async () => {
  await db.close();
});

function sync(options: { now?: Date } = {}) {
  return syncBankLinks({
    db,
    householdId: home.householdId,
    client: createFakeBankClient(fixture),
    now: options.now ?? NOW,
  });
}

/** The AI step with no model: every new row becomes an Uncategorised Transaction. */
function process(now = NOW) {
  return processBankRows({
    db,
    householdId: home.householdId,
    model: null,
    now,
    deadline: new Date(Date.now() + 60_000),
  });
}

async function syncAndProcess(options: { now?: Date } = {}) {
  const results = await sync(options);
  await process(options.now);
  return results;
}

function push(mutations: ReturnType<typeof mutation>[]) {
  return applyMutations(
    db,
    home.householdId,
    { clientId: CLIENT, mutations },
    NOW,
  );
}

function expense(
  date: string,
  amountMinor: number,
  extra: { status?: "posted" | "expected"; accountId?: string } = {},
) {
  const id = randomUUID();
  return {
    id,
    mutation: mutation("createTransaction", {
      id,
      kind: "expense",
      status: extra.status,
      date,
      amountMinor,
      categoryId: home.groceriesId,
      payeeId: home.grocerId,
      memberId: home.memberId,
      entries: [
        {
          id: randomUUID(),
          accountId: extra.accountId ?? home.currentId,
          amountMinor,
        },
      ],
    }),
  };
}

async function liveTransactions() {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, home.householdId),
        isNull(transactions.deletedAt),
      ),
    )
    .orderBy(asc(transactions.date), asc(transactions.id));
}

async function bankRows(linkId = currentLinkId) {
  return db
    .select()
    .from(bankTransactions)
    .where(eq(bankTransactions.linkId, linkId))
    .orderBy(asc(bankTransactions.providerTxId));
}

async function link(id: string) {
  const [row] = await db.select().from(bankLinks).where(eq(bankLinks.id, id));
  return row;
}

describe("syncBankLinks", () => {
  it("stores new rows for the AI step and labels none of them", async () => {
    fixture.transactions["acc-current"] = [
      providerRow("t1", "2026-10-08", -1234, "TESCO STORES 3297"),
      providerRow("t2", "2026-10-09", -2150, "DELIVEROO*KFC"),
    ];

    const [current, card] = await sync();

    expect(current).toMatchObject({ error: null, pending: 2, linked: 0 });
    expect(card).toMatchObject({ error: null, pending: 0 });
    expect(await liveTransactions()).toEqual([]);
    const stored = await bankRows();
    expect(
      stored.map((row) => [row.providerTxId, row.state, row.labelAttempts]),
    ).toEqual([
      ["t1", "new", 0],
      ["t2", "new", 0],
    ]);
    const currentLink = await link(currentLinkId);
    expect(currentLink.lastSyncedOn).toBe("2026-10-10");
  });

  it("changes nothing on a second sync of the same rows", async () => {
    fixture.transactions["acc-current"] = [
      providerRow("t1", "2026-10-08", -1234, "SOMEWHERE"),
    ];
    await syncAndProcess();
    const before = await liveTransactions();
    const entriesBefore = await db.select().from(entries);

    const [second] = await sync({ now: NEXT_DAY });

    expect(second).toMatchObject({ pending: 0, linked: 0, confirmed: 0 });
    expect(await liveTransactions()).toEqual(before);
    expect(await db.select().from(entries)).toEqual(entriesBefore);
  });

  it("confirms an Expected Transaction that a bank row matches", async () => {
    const expected = expense("2026-10-09", -999, { status: "expected" });
    await push([expected.mutation]);
    fixture.transactions["acc-current"] = [
      providerRow("t1", "2026-10-08", -999, "GYM"),
    ];

    const [result] = await sync();

    expect(result).toMatchObject({ confirmed: 1, pending: 0 });
    const [row] = await liveTransactions();
    expect(row).toMatchObject({
      id: expected.id,
      status: "posted",
      date: "2026-10-08",
    });
    expect((await bankRows())[0].transactionId).toBe(expected.id);
  });

  it("links a manual Transaction of the same day instead of adding one", async () => {
    const manual = expense("2026-10-09", -1250);
    await push([manual.mutation]);
    fixture.transactions["acc-current"] = [
      providerRow("t1", "2026-10-09", -1250, "GROCER LTD"),
    ];

    const [result] = await sync();

    expect(result).toMatchObject({ linked: 1, pending: 0 });
    const rows = await liveTransactions();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: manual.id, source: "manual" });
    expect((await bankRows())[0]).toMatchObject({
      state: "matched",
      transactionId: manual.id,
    });
  });

  it("settles an In transit Entry on the account the money reached, and keeps net worth", async () => {
    const { result: inTransitId } = await runServerWrite(
      db,
      home.householdId,
      NOW,
      (context) => ensureInTransitAccount(context, "GBP"),
    );
    const transferId = randomUUID();
    const inTransitEntryId = randomUUID();
    await push([
      mutation("createTransaction", {
        id: transferId,
        kind: "transfer",
        date: "2026-10-08",
        amountMinor: 0,
        entries: [
          { id: randomUUID(), accountId: home.currentId, amountMinor: -50_000 },
          { id: inTransitEntryId, accountId: inTransitId, amountMinor: 50_000 },
        ],
      }),
    ]);
    const accountIds = [home.currentId, home.cardId, inTransitId];
    const balances = () =>
      withHousehold(db, home.householdId, (scope) =>
        Promise.all(
          accountIds.map((id) =>
            valuationRepository.balanceAt(scope, id, "2026-10-10"),
          ),
        ),
      );
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const before = await balances();
    expect(before).toEqual([-50_000, 0, 50_000]);
    fixture.transactions["acc-card"] = [
      providerRow("c1", "2026-10-09", 50_000, "PAYMENT RECEIVED"),
    ];

    const [, card] = await sync();

    expect(card).toMatchObject({ linked: 1, pending: 0 });
    const rows = await liveTransactions();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: transferId, kind: "transfer" });
    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, inTransitEntryId));
    expect(entry).toMatchObject({
      accountId: home.cardId,
      amountMinor: 50_000,
    });
    expect((await bankRows(cardLinkId))[0]).toMatchObject({
      state: "matched",
      transactionId: transferId,
    });
    const after = await balances();
    expect(after).toEqual([-50_000, 50_000, 0]);
    expect(sum(after)).toBe(sum(before));
  });

  it("links a chain of repeated fares to the Transactions one day before them", async () => {
    const days = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"];
    const manual = days.map((day) =>
      expense(addDays(day, -1), -720, { accountId: home.cardId }),
    );
    await push(manual.map((transaction) => transaction.mutation));
    fixture.transactions["acc-card"] = days.map((day) =>
      providerRow(`tfl-${day}`, day, -720, "TFL TRAVEL CH"),
    );
    const [, card] = await sync();

    expect(card).toMatchObject({ error: null, linked: 4, pending: 0 });
    expect(
      (await bankRows(cardLinkId)).map((row) => row.transactionId),
    ).toEqual(manual.map((transaction) => transaction.id));
  });

  it("flags a row the bank leaves out of two answers in a row, and clears the flag when it returns", async () => {
    const cafe = providerRow("t1", "2026-10-05", -700, "CAFE");
    const others = [
      providerRow("t2", "2026-10-06", -800, "BAKERY"),
      providerRow("t3", "2026-10-07", -900, "BUTCHER"),
    ];
    fixture.transactions["acc-current"] = [cafe, ...others];
    await syncAndProcess();
    const created = (await liveTransactions()).find(
      (row) => row.amountMinor === -700,
    );
    await push([
      mutation("updateTransaction", {
        id: created?.id ?? "",
        patch: { needsReview: false },
      }),
    ]);
    fixture.transactions["acc-current"] = others;

    const [once] = await sync({ now: NEXT_DAY });
    const [twice] = await sync({ now: DAY_AFTER });

    expect(once.missing).toBe(0);
    expect(twice.missing).toBe(1);
    const cafeRow = async () =>
      (await bankRows()).find((row) => row.providerTxId === "t1");
    expect((await cafeRow())?.state).toBe("missing");
    const flagged = async () =>
      (await liveTransactions()).find((row) => row.id === created?.id);
    expect((await flagged())?.needsReview).toBe(true);

    fixture.transactions["acc-current"] = [cafe, ...others];
    await sync({ now: THIRD_DAY });

    expect((await cafeRow())?.state).toBe("matched");
    expect((await flagged())?.needsReview).toBe(false);
  });

  it("flags nothing on an empty or short answer", async () => {
    fixture.transactions["acc-current"] = [
      providerRow("t1", "2026-10-05", -700, "CAFE"),
      providerRow("t2", "2026-10-06", -800, "BAKERY"),
      providerRow("t3", "2026-10-07", -900, "BUTCHER"),
    ];
    await syncAndProcess();
    fixture.transactions["acc-current"] = [];
    const [empty] = await sync({ now: NEXT_DAY });
    const [emptyAgain] = await sync({ now: DAY_AFTER });
    fixture.transactions["acc-current"] = [
      providerRow("t3", "2026-10-07", -900, "BUTCHER"),
    ];
    const [short] = await sync({ now: THIRD_DAY });

    expect([empty.missing, emptyAgain.missing, short.missing]).toEqual([
      0, 0, 0,
    ]);
    expect((await bankRows()).map((row) => row.state)).toEqual([
      "matched",
      "matched",
      "matched",
    ]);
  });

  it("keeps a Review that the missing flag did not set", async () => {
    const rows = [
      providerRow("t1", "2026-10-05", -700, "CAFE"),
      providerRow("t2", "2026-10-06", -800, "BAKERY"),
      providerRow("t3", "2026-10-07", -900, "BUTCHER"),
    ];
    fixture.transactions["acc-current"] = rows;
    await syncAndProcess();
    fixture.transactions["acc-current"] = rows.slice(1);
    await sync({ now: NEXT_DAY });
    await sync({ now: DAY_AFTER });
    fixture.transactions["acc-current"] = rows;

    await sync({ now: THIRD_DAY });

    const cafe = (await liveTransactions()).find(
      (row) => row.amountMinor === -700,
    );
    expect(cafe?.needsReview).toBe(true);
  });

  it("leaves a returning missing row without a Transaction for the AI step", async () => {
    fixture.transactions["acc-current"] = [
      providerRow("t1", "2026-10-08", -1500, "NEW PLACE"),
    ];
    await db.insert(bankTransactions).values({
      id: randomUUID(),
      householdId: home.householdId,
      linkId: currentLinkId,
      providerTxId: "t1",
      date: "2026-10-08",
      amountMinor: -1500,
      currency: "GBP",
      description: "NEW PLACE",
      raw: {},
      state: "missing",
      version: 0,
    });
    const [result] = await sync();

    expect(result.pending).toBe(1);
    expect((await bankRows())[0].state).toBe("new");
  });

  it("leaves out links tried after skipSyncedAfter", async () => {
    await db
      .update(bankLinks)
      .set({ lastSyncAt: new Date(NOW.getTime() - 60 * 60 * 1000) })
      .where(eq(bankLinks.id, cardLinkId));

    const results = await syncBankLinks({
      db,
      householdId: home.householdId,
      client: createFakeBankClient(fixture),
      now: NOW,
      skipSyncedAfter: new Date(NOW.getTime() - 5 * 60 * 60 * 1000),
    });

    expect(results.map((result) => result.linkId)).toEqual([currentLinkId]);
  });

  it("inverts amounts when the link's sign multiplier is -1", async () => {
    await db
      .update(bankLinks)
      .set({ signMultiplier: -1 })
      .where(eq(bankLinks.id, cardLinkId));
    fixture.transactions["acc-card"] = [
      providerRow("c1", "2026-10-07", 2000, "SHOP"),
    ];

    await syncAndProcess();

    const [row] = await liveTransactions();
    expect(row).toMatchObject({
      kind: "expense",
      amountMinor: -2000,
      categoryId: uncategorised.expense,
      needsReview: true,
    });
    const [entry] = await db
      .select()
      .from(entries)
      .where(eq(entries.transactionId, row.id));
    expect(entry).toMatchObject({ accountId: home.cardId, amountMinor: -2000 });
  });

  it("records a reconnect error and goes on with the next link", async () => {
    fixture.errors = { "acc-current": "reconnect" };
    fixture.transactions["acc-card"] = [
      providerRow("c1", "2026-10-07", -300, "SHOP"),
    ];

    const [current, card] = await sync();

    expect(current.error).toBe("reconnect");
    expect(card).toMatchObject({ error: null, pending: 1 });
    expect(await link(currentLinkId)).toMatchObject({
      status: "reconnect",
      lastError: "reconnect",
      lastSyncedOn: null,
    });
    expect((await link(cardLinkId)).lastSyncedOn).toBe("2026-10-10");
  });

  it("notes a bank balance that differs from ours", async () => {
    fixture.balances["acc-card"] = { amountMinor: -500, currency: "GBP" };

    const [current, card] = await sync();

    expect(current.balanceDifferenceMinor).toBeNull();
    expect(card.balanceDifferenceMinor).toBe(-500);
    expect(await link(cardLinkId)).toMatchObject({
      bankBalanceMinor: -500,
      balanceDifferenceMinor: -500,
    });
  });

  it("notes no balance difference while rows wait for the AI step, and compares once they are written", async () => {
    fixture.transactions["acc-current"] = [
      providerRow("t1", "2026-10-08", -1000, "SHOP"),
    ];
    fixture.transactions["acc-card"] = [
      providerRow("c1", "2026-10-08", -300, "CAFE"),
    ];
    fixture.balances["acc-current"] = { amountMinor: -900, currency: "GBP" };
    fixture.balances["acc-card"] = { amountMinor: -300, currency: "GBP" };

    const [current, card] = await sync();

    expect(current).toMatchObject({ pending: 1, balanceDifferenceMinor: null });
    expect(card).toMatchObject({ pending: 1, balanceDifferenceMinor: null });
    expect(await link(currentLinkId)).toMatchObject({
      bankBalanceMinor: -900,
      bankBalanceOn: "2026-10-10",
      balanceDifferenceMinor: null,
    });
    await process();
    expect(await link(currentLinkId)).toMatchObject({
      balanceDifferenceMinor: 100,
    });
    expect(await link(cardLinkId)).toMatchObject({
      bankBalanceMinor: -300,
      balanceDifferenceMinor: null,
    });
  });
});
