import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { balanceAt } from "../domain/balance/balance-at.ts";
import { compareTransactionsByDateDesc } from "../store/compare-transactions-by-date-desc.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectNetWorthAt } from "../store/select-net-worth-at.ts";
import { selectTransactionsByAccount } from "../store/select-transactions-by-account.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import { MutationError } from "../sync/mutation-error.ts";
import type { SyncRows } from "../sync/row-schemas.ts";
import {
  applyTestBootstrap,
  TEST_IDS,
  testExpense,
  testHousehold,
  testReplicaRows,
  testStamps,
} from "../transactions/testing/create-test-replica.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import { createReplicaStore } from "./create-replica-store.ts";

const NOW = "2026-10-10T09:00:00.000Z";
const HOUSEHOLD = TEST_IDS.household;
const CURRENT = TEST_IDS.current;
const GROCERIES = TEST_IDS.groceries;

function serverTransaction(id: string, date: string, amountMinor: number) {
  return testExpense(id, randomUUID(), {
    date,
    amountMinor,
    accountId: CURRENT,
  });
}

function seedRows(): Partial<SyncRows> {
  const first = serverTransaction(randomUUID(), "2026-10-03", -2_000);
  const second = serverTransaction(randomUUID(), "2026-10-05", -3_000);
  return {
    ...testReplicaRows(),
    valuations: [
      {
        id: randomUUID(),
        householdId: HOUSEHOLD,
        accountId: CURRENT,
        on: "2026-10-01",
        amountMinor: 100_000,
        source: "import",
        note: "",
        ...testStamps,
      },
    ],
    transactions: [first.transaction, second.transaction],
    entries: [first.entry, second.entry],
    transactionTags: [],
    accountBalanceDays: (
      [
        ["2026-10-01", 100_000],
        ["2026-10-03", 98_000],
        ["2026-10-05", 95_000],
      ] as const
    ).map(([day, balanceMinor]) => ({
      householdId: HOUSEHOLD,
      accountId: CURRENT,
      day,
      balanceMinor,
      version: 1,
      deletedAt: null,
    })),
  };
}

async function seededStore() {
  const persistence = createMemoryPersistence();
  const store = createReplicaStore({
    householdId: HOUSEHOLD,
    persistence,
    now: () => new Date(NOW),
  });
  await store.load();
  applyTestBootstrap(store, seedRows());
  store.finishBootstrap(10, new Set());
  return { store, persistence };
}

function expense(id: string, date: string, amount: number) {
  return {
    name: "createTransaction" as const,
    args: {
      id,
      kind: "expense" as const,
      date,
      amountMinor: -amount,
      categoryId: GROCERIES,
      entries: [{ id: randomUUID(), accountId: CURRENT, amountMinor: -amount }],
      tagIds: [],
    },
  };
}

describe("createReplicaStore", () => {
  it("moves the balance and the net worth at once for a pending expense", async () => {
    const { store } = await seededStore();
    expect(selectNetWorthAt(store.getSnapshot(), "2026-10-10")).toBe(95_000);

    store.applyLocal(expense(randomUUID(), "2026-10-04", 500));
    const snapshot = store.getSnapshot();
    const series = selectBalanceSeriesByAccount(snapshot).get(CURRENT);
    if (!series) throw new Error("No series");
    expect(balanceAt(series, "2026-10-02")).toBe(100_000);
    expect(balanceAt(series, "2026-10-04")).toBe(97_500);
    expect(balanceAt(series, "2026-10-10")).toBe(94_500);
    expect(selectNetWorthAt(snapshot, "2026-10-10")).toBe(94_500);
    expect(snapshot.pendingAccounts.get(CURRENT)).toBe("2026-10-04");
  });

  it("lists the rows it loads from disk after a read before the load", async () => {
    const { store, persistence } = await seededStore();
    await store.flush();
    const reopened = createReplicaStore({
      householdId: HOUSEHOLD,
      persistence,
      now: () => new Date(NOW),
    });
    expect(selectTransactionsByDateDesc(reopened.getSnapshot())).toEqual([]);
    await reopened.load();
    expect(selectTransactionsByDateDesc(reopened.getSnapshot())).toHaveLength(
      2,
    );
  });

  it("keeps the sorted list in step without sorting again", async () => {
    const { store } = await seededStore();
    const before = selectTransactionsByDateDesc(store.getSnapshot());
    const id = randomUUID();
    store.applyLocal(expense(id, "2026-10-04", 500));
    const after = selectTransactionsByDateDesc(store.getSnapshot());
    expect(after).not.toBe(before);
    expect(after.map((row) => row.date)).toEqual([
      "2026-10-05",
      "2026-10-04",
      "2026-10-03",
    ]);
    expect(after).toEqual(
      [...store.getSnapshot().tables.transactions.values()].sort(
        compareTransactionsByDateDesc,
      ),
    );

    store.applyLocal({
      name: "updateTransaction",
      args: { id, patch: { date: "2026-10-09" } },
    });
    store.applyLocal({ name: "deleteTransaction", args: { id: after[2].id } });
    const latest = selectTransactionsByDateDesc(store.getSnapshot());
    expect(latest.map((row) => row.date)).toEqual(["2026-10-09", "2026-10-05"]);
    expect(
      selectTransactionsByAccount(store.getSnapshot()).get(CURRENT),
    ).toEqual(latest);
  });

  it("refuses a mutation the server would reject and changes nothing", async () => {
    const { store } = await seededStore();
    const snapshot = store.getSnapshot();
    expect(() =>
      store.applyLocal({
        name: "createTransaction",
        args: {
          ...expense(randomUUID(), "2026-10-04", 5).args,
          categoryId: null,
        },
      }),
    ).toThrow(MutationError);
    expect(() =>
      store.applyLocal({
        name: "createTransaction",
        args: { ...expense(randomUUID(), "2026-13-04", 5).args },
      }),
    ).toThrow(ZodError);
    expect(store.getSnapshot()).toBe(snapshot);
  });

  it("replays queued mutations over a pull", async () => {
    const { store } = await seededStore();
    const id = randomUUID();
    store.applyLocal(expense(id, "2026-10-08", 700));
    const other = randomUUID();
    store.applyPull(
      {
        clock: 11,
        household: { ...testHousehold, clock: 11 },
        tables: {
          transactions: [
            serverTransaction(other, "2026-10-07", -100).transaction,
          ],
        },
      },
      new Set(),
    );
    const snapshot = store.getSnapshot();
    expect(snapshot.tables.transactions.has(id)).toBe(true);
    expect(snapshot.tables.transactions.has(other)).toBe(true);
    expect(snapshot.pendingKeys.has(`transactions:${id}`)).toBe(true);
    expect(
      selectTransactionsByDateDesc(snapshot).map((row) => row.id),
    ).toContain(other);
  });

  it("keeps the outbox on disk until the server takes it", async () => {
    const { store, persistence } = await seededStore();
    const created = store.applyLocal(expense(randomUUID(), "2026-10-08", 700));
    await store.flush();
    expect(
      (await persistence.loadOutbox()).map((entry) => entry.mutation.id),
    ).toEqual([created.id]);

    const reopened = createReplicaStore({
      householdId: HOUSEHOLD,
      persistence,
    });
    await reopened.load();
    expect(reopened.getSnapshot().outboxCount).toBe(1);
    expect(reopened.getSnapshot().bootstrapped).toBe(true);
    expect(reopened.takeOutbox()).toEqual([created]);

    reopened.acknowledge([created.id], {
      applied: [created.id],
      rejected: [],
      clock: 11,
    });
    await reopened.flush();
    expect(await persistence.loadOutbox()).toMatchObject([
      { mutation: created, acknowledged: true },
    ]);
    expect(reopened.getSnapshot().outboxCount).toBe(0);
    expect(reopened.getSnapshot().pendingKeys.size).toBeGreaterThan(0);
  });

  it("works out a balance again only for an update that moves it", async () => {
    const { store } = await seededStore();
    const [first] = store.getSnapshot().tables.transactions.keys();
    store.applyLocal({
      name: "updateTransaction",
      args: { id: first, patch: { note: "lunch" } },
    });
    expect(store.getSnapshot().pendingAccounts.size).toBe(0);

    store.applyLocal({
      name: "updateTransaction",
      args: { id: first, patch: { date: "2026-10-02" } },
    });
    expect(store.getSnapshot().pendingAccounts.get(CURRENT)).toBe("2026-10-02");
  });

  it("shows the bootstrap rows once, when the bootstrap finishes", async () => {
    const persistence = createMemoryPersistence();
    const store = createReplicaStore({ householdId: HOUSEHOLD, persistence });
    await store.load();
    applyTestBootstrap(store, seedRows());
    expect(store.getSnapshot().tables.transactions.size).toBe(0);

    store.finishBootstrap(10, new Set());
    expect(store.getSnapshot().tables.transactions.size).toBe(2);
    expect(selectNetWorthAt(store.getSnapshot(), "2026-10-10")).toBe(95_000);
    await store.flush();
    expect((await persistence.load()).tables.transactions.size).toBe(2);
  });

  it("tells other tabs to reload only after a pull that changes something", async () => {
    const { store } = await seededStore();
    const revision = store.getDiskRevision();
    store.applyPull(
      { clock: 10, household: testHousehold, tables: {} },
      new Set(),
    );
    expect(store.getDiskRevision()).toBe(revision);

    store.applyPull(
      {
        clock: 11,
        household: { ...testHousehold, clock: 11 },
        tables: {
          transactions: [
            serverTransaction(randomUUID(), "2026-10-07", -100).transaction,
          ],
        },
      },
      new Set(),
    );
    expect(store.getDiskRevision()).not.toBe(revision);
  });

  it("adds and replaces exchange rates, keeps them through a bootstrap, and shows them to another tab", async () => {
    const { store, persistence } = await seededStore();
    const usd = {
      base: "USD",
      quote: "GBP",
      on: "2026-10-01",
      rate: 0.8,
      source: "ecb" as const,
    };
    const revision = store.getDiskRevision();
    store.applyExchangeRates({ cursor: "1.a", replace: true, rates: [usd] });
    const added = store.getSnapshot().exchangeRates;
    expect([...added.values()]).toEqual([usd]);
    expect(store.getDiskRevision()).not.toBe(revision);

    store.applyExchangeRates({ cursor: "1.a", replace: false, rates: [] });
    expect(store.getSnapshot().exchangeRates).toBe(added);

    const next = { ...usd, on: "2026-10-02", rate: 0.81 };
    store.applyExchangeRates({ cursor: "2.a", replace: false, rates: [next] });
    expect(store.getSnapshot().exchangeRates.size).toBe(2);

    store.startBootstrap(testHousehold);
    store.finishBootstrap(11, new Set());
    expect(store.getSnapshot().exchangeRates.size).toBe(2);

    await store.flush();
    const other = createReplicaStore({ householdId: HOUSEHOLD, persistence });
    await other.load();
    expect(other.getSnapshot().exchangeRates.size).toBe(2);
    expect(other.getMeta().exchangeRateCursor).toBe("2.a");

    store.applyExchangeRates({ cursor: "3.b", replace: true, rates: [next] });
    expect([...store.getSnapshot().exchangeRates.values()]).toEqual([next]);
  });
});
