import type { ExchangeRateRow } from "../../exchange-rates/exchange-rate-row-schema.ts";
import { createFinanceRuntime } from "../../replica/create-finance-runtime.ts";
import { createMemoryPersistence } from "../../replica/create-memory-persistence.ts";
import type { ReplicaStore } from "../../replica/create-replica-store.ts";
import {
  SYNC_TABLE_NAMES,
  type AccountRow,
  type EntryRow,
  type HouseholdRow,
  type SyncRows,
  type TransactionRow,
} from "../../sync/row-schemas.ts";

const NOW = "2026-10-01T09:00:00.000Z";
/** The version and timestamps of every test row. */
export const testStamps = {
  version: 1,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
};

/** Fixed ids of the synthetic Household, so tests can name its rows. */
export const TEST_IDS = {
  household: "00000000-0000-4000-8000-000000000001",
  alex: "00000000-0000-4000-8000-0000000000a1",
  sam: "00000000-0000-4000-8000-0000000000a2",
  cashGroup: "00000000-0000-4000-8000-0000000000b1",
  investGroup: "00000000-0000-4000-8000-0000000000b2",
  creditGroup: "00000000-0000-4000-8000-0000000000b3",
  current: "00000000-0000-4000-8000-0000000000c1",
  card: "00000000-0000-4000-8000-0000000000c2",
  isa: "00000000-0000-4000-8000-0000000000c3",
  dollars: "00000000-0000-4000-8000-0000000000c4",
  groceries: "00000000-0000-4000-8000-0000000000d1",
  dining: "00000000-0000-4000-8000-0000000000d2",
  transport: "00000000-0000-4000-8000-0000000000d3",
  salary: "00000000-0000-4000-8000-0000000000d4",
  tesco: "00000000-0000-4000-8000-0000000000e1",
  netflix: "00000000-0000-4000-8000-0000000000e2",
  weeklyShop: "00000000-0000-4000-8000-0000000000f1",
  tescoShop: "00000000-0000-4000-8000-000000000101",
  tescoShopEntry: "00000000-0000-4000-8000-000000000201",
} as const;

const ids = TEST_IDS;

export const testHousehold: HouseholdRow = {
  id: ids.household,
  name: "Home",
  baseCurrency: "GBP",
  timezone: "Europe/London",
  aiInstructions: "",
  clock: 10,
};

/** An open GBP cash account of the test Household with no owner, named after its id. */
export function testAccount(
  id: string,
  fields: Partial<AccountRow> = {},
): AccountRow {
  return {
    id,
    householdId: ids.household,
    groupId: ids.cashGroup,
    ownerMemberId: null,
    name: id,
    institution: "",
    institutionDomain: null,
    guessedInstitutionDomain: null,
    institutionIconVersion: null,
    kind: "cash",
    currency: "GBP",
    excludedFromNetWorth: false,
    closedOn: null,
    position: 0,
    creditLimitMinor: null,
    statementDay: null,
    paymentDueDay: null,
    defaultPaymentAccountId: null,
    isSystem: false,
    ...testStamps,
    ...fields,
  };
}

function testCategory(
  id: string,
  name: string,
  kind: "expense" | "income",
  emoji: string,
  position: number,
) {
  return {
    id,
    householdId: ids.household,
    parentId: null,
    kind,
    name,
    emoji,
    color: "",
    position,
    isSystem: false,
    archivedAt: null,
    ...testStamps,
  };
}

/** A posted Transaction with one Entry, for test histories. */
export function testExpense(
  id: string,
  entryId: string,
  fields: {
    date: string;
    amountMinor: number;
    accountId: string;
    payeeId?: string | null;
    categoryId?: string;
    memberId?: string | null;
    status?: "posted" | "expected";
    needsReview?: boolean;
    labelledBy?: "member" | "ai";
    aiReason?: string | null;
    searchText?: string;
  },
): { transaction: TransactionRow; entry: EntryRow } {
  return {
    transaction: {
      id,
      householdId: ids.household,
      kind:
        fields.amountMinor > 0 && fields.categoryId === ids.salary
          ? "income"
          : "expense",
      status: fields.status ?? "posted",
      date: fields.date,
      categoryId: fields.categoryId ?? ids.groceries,
      payeeId: fields.payeeId ?? null,
      memberId: fields.memberId ?? null,
      ruleId: null,
      refundOfId: null,
      note: "",
      source: "manual",
      needsReview: fields.needsReview ?? false,
      labelledBy: fields.labelledBy ?? "member",
      aiReason: fields.aiReason ?? null,
      searchText: fields.searchText ?? "",
      ...testStamps,
      createdAt: `${fields.date}T12:00:00.000Z`,
    },
    entry: {
      id: entryId,
      householdId: ids.household,
      transactionId: id,
      accountId: fields.accountId,
      date: fields.date,
      amountMinor: fields.amountMinor,
      position: 0,
      ...testStamps,
    },
  };
}

/** A small synthetic Household: two Members, four accounts (one in USD), four Categories, two Payees, a Tag and one Tesco shop. */
export function testReplicaRows(): Partial<SyncRows> {
  const shop = testExpense(ids.tescoShop, ids.tescoShopEntry, {
    date: "2026-09-26",
    amountMinor: -4_210,
    accountId: ids.card,
    payeeId: ids.tesco,
    categoryId: ids.groceries,
    memberId: ids.sam,
    searchText: "tesco groceries",
  });
  return {
    members: [
      {
        id: ids.alex,
        householdId: ids.household,
        userId: null,
        name: "Alex",
        role: "owner",
        ...testStamps,
      },
      {
        id: ids.sam,
        householdId: ids.household,
        userId: null,
        name: "Sam",
        role: "member",
        ...testStamps,
      },
    ],
    accountGroups: [
      { id: ids.cashGroup, name: "Cash", side: "asset" as const, position: 0 },
      {
        id: ids.investGroup,
        name: "Investments",
        side: "asset" as const,
        position: 1,
      },
      {
        id: ids.creditGroup,
        name: "Credit",
        side: "liability" as const,
        position: 2,
      },
    ].map((group) => ({ ...group, householdId: ids.household, ...testStamps })),
    accounts: [
      testAccount(ids.current, {
        name: "Current account",
        ownerMemberId: ids.alex,
      }),
      testAccount(ids.dollars, {
        name: "Dollar account",
        currency: "USD",
        ownerMemberId: ids.sam,
        position: 1,
      }),
      testAccount(ids.isa, {
        groupId: ids.investGroup,
        name: "Stocks ISA",
        kind: "investment",
      }),
      testAccount(ids.card, {
        groupId: ids.creditGroup,
        name: "Credit card",
        kind: "credit",
        ownerMemberId: ids.alex,
      }),
    ],
    categories: [
      testCategory(ids.groceries, "Groceries", "expense", "🛒", 0),
      testCategory(ids.dining, "Dining", "expense", "🍽️", 1),
      testCategory(ids.transport, "Transport", "expense", "🚇", 2),
      testCategory(ids.salary, "Salary", "income", "💼", 3),
    ],
    payees: [
      {
        id: ids.tesco,
        name: "Tesco",
        defaultCategoryId: ids.groceries,
      },
      { id: ids.netflix, name: "Netflix", defaultCategoryId: null },
    ].map((payee) => ({
      ...payee,
      householdId: ids.household,
      note: "",
      defaultAccountId: null,
      mergedIntoId: null,
      ...testStamps,
    })),
    tags: [
      {
        id: ids.weeklyShop,
        householdId: ids.household,
        name: "Weekly shop",
        position: 0,
        ...testStamps,
      },
    ],
    transactions: [shop.transaction],
    entries: [shop.entry],
    transactionTags: [
      {
        transactionId: ids.tescoShop,
        tagId: ids.weeklyShop,
        householdId: ids.household,
        version: 1,
        deletedAt: null,
      },
    ],
  };
}

const testExchangeRates: ExchangeRateRow[] = [
  { base: "GBP", quote: "USD", on: "2026-01-01", rate: 1.25, source: "ecb" },
];

/** A Finance runtime on memory persistence and no network, before it loads the Replica. */
export function createUnloadedTestRuntime() {
  return createFinanceRuntime({
    householdId: ids.household,
    persistence: createMemoryPersistence(),
    onUnauthorised: () => undefined,
    fetch: () => Promise.reject(new Error("No network in tests")),
  });
}

/**
 * A Finance runtime on memory persistence with `rows` bootstrapped and no
 * network: tests read the Outbox with `runtime.store.takeOutbox()`.
 */
export async function createTestReplica(
  rows: Partial<SyncRows> = testReplicaRows(),
  exchangeRates: readonly ExchangeRateRow[] = testExchangeRates,
) {
  const runtime = createUnloadedTestRuntime();
  const { store } = runtime;
  await store.load();
  applyTestBootstrap(store, rows);
  store.finishBootstrap(10, new Set());
  store.applyExchangeRates({
    cursor: "test",
    replace: true,
    rates: [...exchangeRates],
  });
  return runtime;
}

/** Starts a bootstrap of the test Household and applies `rows`, but does not finish it. */
export function applyTestBootstrap(
  store: ReplicaStore,
  rows: Partial<SyncRows>,
) {
  store.startBootstrap(testHousehold);
  for (const table of SYNC_TABLE_NAMES) {
    const tableRows = rows[table];
    if (tableRows) store.applyBootstrapRows(table, tableRows);
  }
}
