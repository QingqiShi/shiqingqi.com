import { createFinanceRuntime } from "../../replica/create-finance-runtime.ts";
import { createMemoryPersistence } from "../../replica/create-memory-persistence.ts";
import { REPLICA_TABLE_NAMES } from "../../replica/replica-table-names.ts";
import type { SyncRows } from "../../sync/row-schemas.ts";

const NOW = "2026-10-01T09:00:00.000Z";
const stamps = { version: 1, createdAt: NOW, updatedAt: NOW, deletedAt: null };

/** Fixed ids of the synthetic Household the Settings tests use. */
export const SETTINGS_IDS = {
  household: "00000000-0000-4000-8000-000000000001",
  alex: "00000000-0000-4000-8000-0000000000a1",
  sam: "00000000-0000-4000-8000-0000000000a2",
  kim: "00000000-0000-4000-8000-0000000000a3",
  cash: "00000000-0000-4000-8000-0000000000b1",
  savings: "00000000-0000-4000-8000-0000000000b2",
  cards: "00000000-0000-4000-8000-0000000000b3",
  current: "00000000-0000-4000-8000-0000000000c1",
  visa: "00000000-0000-4000-8000-0000000000c2",
  brokerage: "00000000-0000-4000-8000-0000000000c3",
  groceries: "00000000-0000-4000-8000-0000000000d1",
  dining: "00000000-0000-4000-8000-0000000000d2",
  tfl: "00000000-0000-4000-8000-0000000000e1",
};

const ids = SETTINGS_IDS;

function rows(): Partial<SyncRows> {
  const group = (
    id: string,
    name: string,
    side: "asset" | "liability",
    position: number,
  ) => ({
    id,
    householdId: ids.household,
    name,
    side,
    position,
    ...stamps,
  });
  const category = (id: string, name: string) => ({
    id,
    householdId: ids.household,
    parentId: null,
    kind: "expense" as const,
    name,
    emoji: "",
    color: "",
    position: 0,
    isSystem: false,
    archivedAt: null,
    ...stamps,
  });
  const account = (
    id: string,
    groupId: string,
    name: string,
    institution: string,
    kind: "cash" | "credit" | "investment",
    currency: string,
  ) => ({
    id,
    householdId: ids.household,
    groupId,
    ownerMemberId: ids.alex,
    name,
    institution,
    kind,
    currency,
    excludedFromNetWorth: false,
    closedOn: null,
    position: 0,
    creditLimitMinor: null,
    statementDay: null,
    paymentDueDay: null,
    defaultPaymentAccountId: null,
    ...stamps,
  });
  return {
    members: [
      {
        id: ids.alex,
        householdId: ids.household,
        userId: ids.alex,
        name: "Alex",
        role: "owner",
        ...stamps,
      },
      {
        id: ids.sam,
        householdId: ids.household,
        userId: null,
        name: "Sam",
        role: "member",
        ...stamps,
      },
      {
        id: ids.kim,
        householdId: ids.household,
        userId: ids.kim,
        name: "Kim",
        role: "member",
        ...stamps,
      },
    ],
    accountGroups: [
      group(ids.cash, "Cash", "asset", 0),
      group(ids.savings, "Savings", "asset", 1),
      group(ids.cards, "Cards", "liability", 2),
    ],
    accounts: [
      account(ids.current, ids.cash, "Current account", "Monzo", "cash", "GBP"),
      account(ids.visa, ids.cards, "Alex Visa", "Northbank", "credit", "GBP"),
      account(
        ids.brokerage,
        ids.savings,
        "US Brokerage",
        "Atlas",
        "investment",
        "USD",
      ),
    ],
    fxRates: [
      {
        householdId: ids.household,
        base: "USD",
        quote: "GBP",
        on: "2026-09-01",
        rate: 0.75,
        source: "manual",
        version: 1,
      },
    ],
    categories: [
      category(ids.groceries, "Groceries"),
      category(ids.dining, "Eating out"),
    ],
    payees: [
      {
        id: ids.tfl,
        householdId: ids.household,
        name: "TfL",
        note: "",
        defaultCategoryId: null,
        defaultAccountId: null,
        mergedIntoId: null,
        ...stamps,
      },
    ],
  };
}

/** A Replica runtime in memory, loaded with a small synthetic Household and never started. */
export async function createSettingsReplica() {
  const runtime = createFinanceRuntime({
    householdId: ids.household,
    persistence: createMemoryPersistence(),
    onUnauthorised: () => undefined,
    fetch: () => Promise.reject(new Error("offline in tests")),
  });
  await runtime.store.load();
  runtime.store.startBootstrap({
    household: {
      id: ids.household,
      name: "Home",
      baseCurrency: "GBP",
      timezone: "Europe/London",
      clock: 10,
    },
    transactionsFrom: null,
  });
  const seed = rows();
  for (const table of REPLICA_TABLE_NAMES) {
    const tableRows = seed[table];
    if (tableRows) runtime.store.applyBootstrapRows(table, tableRows);
  }
  runtime.store.finishBootstrap(10, new Set());
  return runtime;
}
