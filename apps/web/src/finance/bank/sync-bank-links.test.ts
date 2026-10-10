import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLabellingModel } from "../ai/testing/create-labelling-model.ts";
import {
  bankLinks,
  bankTransactions,
  entries,
  households,
  payeeAliases,
  payees,
  transactions,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import type { MutationInput, MutationName } from "../sync/mutation-schema.ts";
import {
  createFakeBankClient,
  type FakeBankFixture,
} from "./lunchflow/create-fake-bank-client.ts";
import type { ProviderTransaction } from "./lunchflow/types.ts";
import { syncBankLinks } from "./sync-bank-links.ts";
import { seedBankLink, seedUncategorised } from "./testing/seed-bank-link.ts";

const NOW = new Date("2026-10-10T12:00:00Z");
const NEXT_DAY = new Date("2026-10-11T12:00:00Z");
const DAY_AFTER = new Date("2026-10-12T12:00:00Z");
const THIRD_DAY = new Date("2026-10-13T12:00:00Z");
const CLIENT = "00000000-0000-4000-8000-00000000c001";
const DB_HOOK_TIMEOUT = 60_000;

let db: TestDb;
let home: SeededHousehold;
let uncategorised: { expense: string; income: string };
let currentLinkId: string;
let cardLinkId: string;
let fixture: FakeBankFixture;

function providerAccount(id: string) {
  return {
    id,
    connectionId: "c1",
    name: id,
    institution: "Example Bank",
    institutionLogo: null,
    provider: "gocardless",
    currency: "GBP",
    status: "ACTIVE",
  };
}

function bankRow(
  id: string,
  date: string,
  amountMinor: number,
  text: string,
): ProviderTransaction {
  return {
    id,
    date,
    amountMinor,
    currency: "GBP",
    merchant: "",
    description: text,
    raw: { id },
  };
}

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
}, DB_HOOK_TIMEOUT);

afterEach(async () => {
  await db.close();
});

function sync(
  options: { model?: ReturnType<typeof createLabellingModel>; now?: Date } = {},
) {
  return syncBankLinks({
    db,
    householdId: home.householdId,
    client: createFakeBankClient(fixture),
    model: options.model ?? null,
    now: options.now ?? NOW,
  });
}

function mutation<Name extends MutationName>(
  name: Name,
  args: Extract<MutationInput, { name: Name }>["args"],
) {
  return { id: randomUUID(), name, args };
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

async function clock() {
  const [row] = await db
    .select({ clock: households.clock })
    .from(households)
    .where(eq(households.id, home.householdId));
  return row.clock;
}

describe("syncBankLinks", () => {
  it("creates labelled Transactions on the first sync", async () => {
    await db.insert(payeeAliases).values({
      householdId: home.householdId,
      alias: "TESCO STORES",
      payeeId: home.grocerId,
      version: 0,
    });
    await db
      .update(payees)
      .set({ defaultCategoryId: home.groceriesId })
      .where(eq(payees.id, home.grocerId));
    const earlier = expense("2026-09-01", -500);
    await push([earlier.mutation]);

    fixture.transactions["acc-current"] = [
      bankRow("t1", "2026-10-08", -1234, "TESCO STORES 3297"),
      bankRow("t2", "2026-10-09", -2150, "DELIVEROO*KFC"),
      bankRow("old", "2026-06-01", -100, "TOO OLD"),
    ];
    const model = createLabellingModel(() => ({
      payeeName: "Deliveroo",
      categoryId: home.groceriesId,
      confidence: 0.9,
    }));

    const [current, card] = await sync({ model });

    expect(current).toMatchObject({ error: null, created: 2, linked: 0 });
    expect(card).toMatchObject({ error: null, created: 0 });
    const created = (await liveTransactions()).filter(
      (row) => row.source === "bank",
    );
    expect(created).toHaveLength(2);
    const tesco = created.find((row) => row.date === "2026-10-08");
    expect(tesco).toMatchObject({
      kind: "expense",
      amountMinor: -1234,
      payeeId: home.grocerId,
      categoryId: home.groceriesId,
      needsReview: false,
      memberId: home.memberId,
    });
    expect(tesco?.aiConfidence).toBeCloseTo(0.95);
    const deliveroo = created.find((row) => row.date === "2026-10-09");
    expect(deliveroo).toMatchObject({
      amountMinor: -2150,
      categoryId: home.groceriesId,
      needsReview: true,
      note: "DELIVEROO*KFC",
    });
    const [newPayee] = await db
      .select()
      .from(payees)
      .where(eq(payees.name, "Deliveroo"));
    expect(deliveroo?.payeeId).toBe(newPayee.id);

    const stored = await bankRows();
    expect(stored.map((row) => [row.providerTxId, row.state])).toEqual([
      ["t1", "matched"],
      ["t2", "matched"],
    ]);
    const currentLink = await link(currentLinkId);
    expect(tesco?.version).toBe(currentLink.version);
    expect(await clock()).toBe(currentLink.version + 1);
    expect(currentLink.lastSyncedOn).toBe("2026-10-10");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("changes nothing on a second sync of the same rows", async () => {
    fixture.transactions["acc-current"] = [
      bankRow("t1", "2026-10-08", -1234, "SOMEWHERE"),
    ];
    await sync();
    const before = await liveTransactions();
    const entriesBefore = await db.select().from(entries);

    const [second] = await sync({ now: NEXT_DAY });

    expect(second).toMatchObject({ created: 0, linked: 0, confirmed: 0 });
    expect(await liveTransactions()).toEqual(before);
    expect(await db.select().from(entries)).toEqual(entriesBefore);
  });

  it("confirms an Expected Transaction that a bank row matches", async () => {
    const expected = expense("2026-10-09", -999, { status: "expected" });
    await push([expected.mutation]);
    fixture.transactions["acc-current"] = [
      bankRow("t1", "2026-10-08", -999, "GYM"),
    ];

    const [result] = await sync();

    expect(result).toMatchObject({ confirmed: 1, created: 0 });
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
      bankRow("t1", "2026-10-09", -1250, "GROCER LTD"),
    ];

    const [result] = await sync();

    expect(result).toMatchObject({ linked: 1, created: 0 });
    const rows = await liveTransactions();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: manual.id, source: "manual" });
    expect((await bankRows())[0]).toMatchObject({
      state: "matched",
      transactionId: manual.id,
    });
    const aliases = await db.select().from(payeeAliases);
    expect(aliases).toMatchObject([
      { alias: "GROCER LTD", payeeId: home.grocerId },
    ]);
  });

  it("flags a row the bank leaves out of two answers in a row, and clears the flag when it returns", async () => {
    const cafe = bankRow("t1", "2026-10-05", -700, "CAFE");
    const others = [
      bankRow("t2", "2026-10-06", -800, "BAKERY"),
      bankRow("t3", "2026-10-07", -900, "BUTCHER"),
    ];
    fixture.transactions["acc-current"] = [cafe, ...others];
    await sync();
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
      bankRow("t1", "2026-10-05", -700, "CAFE"),
      bankRow("t2", "2026-10-06", -800, "BAKERY"),
      bankRow("t3", "2026-10-07", -900, "BUTCHER"),
    ];
    await sync();
    fixture.transactions["acc-current"] = [];
    const [empty] = await sync({ now: NEXT_DAY });
    const [emptyAgain] = await sync({ now: DAY_AFTER });
    fixture.transactions["acc-current"] = [
      bankRow("t3", "2026-10-07", -900, "BUTCHER"),
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
      bankRow("t1", "2026-10-05", -700, "CAFE"),
      bankRow("t2", "2026-10-06", -800, "BAKERY"),
      bankRow("t3", "2026-10-07", -900, "BUTCHER"),
    ];
    fixture.transactions["acc-current"] = rows;
    await sync();
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

  it("gives a returning missing row without a Transaction one, labelled once", async () => {
    fixture.transactions["acc-current"] = [
      bankRow("t1", "2026-10-08", -1500, "NEW PLACE"),
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
    const model = createLabellingModel(() => ({
      payeeName: "New Place",
      categoryId: home.groceriesId,
      confidence: 0.9,
    }));

    const [result] = await sync({ model });

    expect(result.created).toBe(1);
    expect(model.doGenerateCalls).toHaveLength(1);
    expect((await bankRows())[0].state).toBe("matched");
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
      model: null,
      now: NOW,
      skipSyncedAfter: new Date(NOW.getTime() - 5 * 60 * 60 * 1000),
    });

    expect(results.map((result) => result.linkId)).toEqual([currentLinkId]);
  });

  it("caps and cleans a Payee name the model proposes", async () => {
    fixture.transactions["acc-current"] = [
      bankRow("t1", "2026-10-08", -1500, "ODD SHOP"),
    ];
    const model = createLabellingModel(() => ({
      payeeName: `Odd\u0000 \u202e Shop ${"x".repeat(500)}`,
      categoryId: home.groceriesId,
      confidence: 0.9,
    }));

    await sync({ model });

    const names = (
      await db
        .select({ name: payees.name })
        .from(payees)
        .where(eq(payees.householdId, home.householdId))
    ).map((row) => row.name);
    const odd = names.find((name) => name.startsWith("Odd"));
    expect(odd?.startsWith("Odd Shop x")).toBe(true);
    expect(odd?.length).toBeLessThanOrEqual(80);
  });

  it("inverts amounts when the link's sign multiplier is -1", async () => {
    await db
      .update(bankLinks)
      .set({ signMultiplier: -1 })
      .where(eq(bankLinks.id, cardLinkId));
    fixture.transactions["acc-card"] = [
      bankRow("c1", "2026-10-07", 2000, "SHOP"),
    ];

    await sync();

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
      bankRow("c1", "2026-10-07", -300, "SHOP"),
    ];

    const [current, card] = await sync();

    expect(current.error).toBe("reconnect");
    expect(card).toMatchObject({ error: null, created: 1 });
    expect(await link(currentLinkId)).toMatchObject({
      status: "reconnect",
      lastError: "reconnect",
      lastSyncedOn: null,
    });
    expect((await link(cardLinkId)).lastSyncedOn).toBe("2026-10-10");
  });

  it("notes a bank balance that differs from ours", async () => {
    fixture.transactions["acc-current"] = [
      bankRow("t1", "2026-10-08", -1000, "SHOP"),
    ];
    fixture.balances["acc-current"] = { amountMinor: -900, currency: "GBP" };
    fixture.balances["acc-card"] = { amountMinor: 0, currency: "GBP" };

    const [current, card] = await sync();

    expect(current.balanceDifferenceMinor).toBe(100);
    expect(card.balanceDifferenceMinor).toBeNull();
    expect(await link(currentLinkId)).toMatchObject({
      bankBalanceMinor: -900,
      bankBalanceOn: "2026-10-10",
      balanceDifferenceMinor: 100,
    });
  });

  it("learns the Payee when a person confirms a bank Transaction", async () => {
    fixture.transactions["acc-current"] = [
      bankRow("t1", "2026-10-01", -1500, "LOCAL GROCER 77 LONDON"),
    ];
    await sync();
    const [created] = await liveTransactions();
    expect(created).toMatchObject({ payeeId: null, needsReview: true });

    const pushed = await push([
      mutation("updateTransaction", {
        id: created.id,
        patch: {
          payeeId: home.grocerId,
          categoryId: home.groceriesId,
          needsReview: false,
        },
      }),
    ]);
    expect(pushed.rejected).toEqual([]);
    const [alias] = await db.select().from(payeeAliases);
    expect(alias).toMatchObject({
      alias: "LOCAL GROCER",
      payeeId: home.grocerId,
      version: pushed.clock,
    });
    const [grocer] = await db
      .select()
      .from(payees)
      .where(eq(payees.id, home.grocerId));
    expect(grocer.defaultCategoryId).toBe(home.groceriesId);

    fixture.transactions["acc-current"].push(
      bankRow("t2", "2026-10-09", -1800, "LOCAL GROCER 12"),
    );
    await sync({ now: NEXT_DAY });
    const second = (await liveTransactions()).find(
      (row) => row.date === "2026-10-09",
    );
    expect(second).toMatchObject({
      payeeId: home.grocerId,
      categoryId: home.groceriesId,
      needsReview: false,
    });
  });
});
