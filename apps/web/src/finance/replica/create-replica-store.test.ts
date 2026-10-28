import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { balanceAt } from "../domain/balance/balance-at.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectNetWorthAt } from "../store/select-net-worth-at.ts";
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
});
