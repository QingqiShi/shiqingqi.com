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
import type { HouseholdRow, SyncRows } from "../sync/row-schemas.ts";
import { createMemoryPersistence } from "./create-memory-persistence.ts";
import { createReplicaStore } from "./create-replica-store.ts";
import { REPLICA_TABLE_NAMES } from "./replica-table-names.ts";

const NOW = "2026-10-10T09:00:00.000Z";
const HOUSEHOLD = randomUUID();
const GROUP = randomUUID();
const CURRENT = randomUUID();
const GROCERIES = randomUUID();
const MEMBER = randomUUID();

const household: HouseholdRow = {
  id: HOUSEHOLD,
  name: "Home",
  baseCurrency: "GBP",
  timezone: "Europe/London",
  clock: 10,
};

const stamps = { version: 1, createdAt: NOW, updatedAt: NOW };

function serverTransaction(id: string, date: string, amountMinor: number) {
  return {
    id,
    householdId: HOUSEHOLD,
    kind: "expense" as const,
    status: "posted" as const,
    date,
    amountMinor,
    categoryId: GROCERIES,
    payeeId: null,
    memberId: null,
    ruleId: null,
    refundOfId: null,
    note: "",
    source: "import" as const,
    needsReview: false,
    aiConfidence: null,
    searchText: "groceries",
    ...stamps,
    deletedAt: null,
  };
}

function serverEntry(transactionId: string, date: string, amountMinor: number) {
  return {
    id: randomUUID(),
    householdId: HOUSEHOLD,
    transactionId,
    accountId: CURRENT,
    date,
    amountMinor,
    fxRate: null,
    position: 0,
    ...stamps,
    deletedAt: null,
  };
}

function seedRows(): Partial<SyncRows> {
  const first = randomUUID();
  const second = randomUUID();
  return {
    members: [
      {
        id: MEMBER,
        householdId: HOUSEHOLD,
        userId: null,
        name: "Alex",
        role: "owner",
        ...stamps,
        deletedAt: null,
      },
    ],
    accountGroups: [
      {
        id: GROUP,
        householdId: HOUSEHOLD,
        name: "Cash",
        side: "asset",
        position: 0,
        ...stamps,
        deletedAt: null,
      },
    ],
    accounts: [
      {
        id: CURRENT,
        householdId: HOUSEHOLD,
        groupId: GROUP,
        ownerMemberId: null,
        name: "Current",
        institution: "",
        kind: "cash",
        currency: "GBP",
        excludedFromNetWorth: false,
        closedOn: null,
        position: 0,
        creditLimitMinor: null,
        statementDay: null,
        paymentDueDay: null,
        defaultPaymentAccountId: null,
        ...stamps,
        deletedAt: null,
      },
    ],
    categories: [
      {
        id: GROCERIES,
        householdId: HOUSEHOLD,
        parentId: null,
        kind: "expense",
        name: "Groceries",
        emoji: "",
        color: "",
        position: 0,
        isSystem: false,
        archivedAt: null,
        ...stamps,
        deletedAt: null,
      },
    ],
    valuations: [
      {
        id: randomUUID(),
        householdId: HOUSEHOLD,
        accountId: CURRENT,
        on: "2026-10-01",
        amountMinor: 100_000,
        source: "import",
        note: "",
        ...stamps,
        deletedAt: null,
      },
    ],
    transactions: [
      serverTransaction(first, "2026-10-03", -2_000),
      serverTransaction(second, "2026-10-05", -3_000),
    ],
    entries: [
      serverEntry(first, "2026-10-03", -2_000),
      serverEntry(second, "2026-10-05", -3_000),
    ],
    accountBalanceDays: [
      {
        householdId: HOUSEHOLD,
        accountId: CURRENT,
        day: "2026-10-01",
        balanceMinor: 100_000,
        version: 1,
        deletedAt: null,
      },
      {
        householdId: HOUSEHOLD,
        accountId: CURRENT,
        day: "2026-10-03",
        balanceMinor: 98_000,
        version: 1,
        deletedAt: null,
      },
      {
        householdId: HOUSEHOLD,
        accountId: CURRENT,
        day: "2026-10-05",
        balanceMinor: 95_000,
        version: 1,
        deletedAt: null,
      },
    ],
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
  store.startBootstrap({ household, transactionsFrom: null });
  const rows = seedRows();
  for (const table of REPLICA_TABLE_NAMES) {
    const tableRows = rows[table];
    if (tableRows) store.applyBootstrapRows(table, tableRows);
  }
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
        household: { ...household, clock: 11 },
        tables: {
          transactions: [serverTransaction(other, "2026-10-07", -100)],
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
    store.startBootstrap({ household, transactionsFrom: null });
    const rows = seedRows();
    for (const table of REPLICA_TABLE_NAMES) {
      const tableRows = rows[table];
      if (tableRows) store.applyBootstrapRows(table, tableRows);
    }
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
    store.applyPull({ clock: 10, household, tables: {} }, new Set());
    expect(store.getDiskRevision()).toBe(revision);

    store.applyPull(
      {
        clock: 11,
        household: { ...household, clock: 11 },
        tables: {
          transactions: [serverTransaction(randomUUID(), "2026-10-07", -100)],
        },
      },
      new Set(),
    );
    expect(store.getDiskRevision()).not.toBe(revision);
  });
});
