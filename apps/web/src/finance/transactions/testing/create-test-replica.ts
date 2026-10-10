import { createFinanceRuntime } from "../../replica/create-finance-runtime.ts";
import { createMemoryPersistence } from "../../replica/create-memory-persistence.ts";
import { REPLICA_TABLE_NAMES } from "../../replica/replica-table-names.ts";
import type {
  EntryRow,
  HouseholdRow,
  SyncRows,
  TransactionRow,
} from "../../sync/row-schemas.ts";

const NOW = "2026-10-01T09:00:00.000Z";
const stamps = { version: 1, createdAt: NOW, updatedAt: NOW, deletedAt: null };

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
  clock: 10,
};

function account(
  id: string,
  groupId: string,
  name: string,
  kind: "cash" | "credit" | "investment",
  position: number,
  fields: { currency?: string; ownerMemberId?: string | null } = {},
) {
  return {
    id,
    householdId: ids.household,
    groupId,
    ownerMemberId: fields.ownerMemberId ?? null,
    name,
    institution: "",
    kind,
    currency: fields.currency ?? "GBP",
    excludedFromNetWorth: false,
    closedOn: null,
    position,
    creditLimitMinor: null,
    statementDay: null,
    paymentDueDay: null,
    defaultPaymentAccountId: null,
    ...stamps,
  };
}

function category(
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
    ...stamps,
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
    aiConfidence?: number | null;
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
      amountMinor: fields.amountMinor,
      categoryId: fields.categoryId ?? ids.groceries,
      payeeId: fields.payeeId ?? null,
      memberId: fields.memberId ?? null,
      ruleId: null,
      refundOfId: null,
      note: "",
      source: "manual",
      needsReview: fields.needsReview ?? false,
      aiConfidence: fields.aiConfidence ?? null,
      searchText: fields.searchText ?? "",
      ...stamps,
      createdAt: `${fields.date}T12:00:00.000Z`,
    },
    entry: {
      id: entryId,
      householdId: ids.household,
      transactionId: id,
      accountId: fields.accountId,
      date: fields.date,
      amountMinor: fields.amountMinor,
      fxRate: null,
      position: 0,
      ...stamps,
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
        version: 1,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
      },
      {
        id: ids.sam,
        householdId: ids.household,
        userId: null,
        name: "Sam",
        role: "member",
        version: 1,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
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
    ].map((group) => ({ ...group, householdId: ids.household, ...stamps })),
    accounts: [
      account(ids.current, ids.cashGroup, "Current account", "cash", 0, {
        ownerMemberId: ids.alex,
      }),
      account(ids.dollars, ids.cashGroup, "Dollar account", "cash", 1, {
        currency: "USD",
        ownerMemberId: ids.sam,
      }),
      account(ids.isa, ids.investGroup, "Stocks ISA", "investment", 0),
      account(ids.card, ids.creditGroup, "Credit card", "credit", 0, {
        ownerMemberId: ids.alex,
      }),
    ],
    categories: [
      category(ids.groceries, "Groceries", "expense", "🛒", 0),
      category(ids.dining, "Dining", "expense", "🍽️", 1),
      category(ids.transport, "Transport", "expense", "🚇", 2),
      category(ids.salary, "Salary", "income", "💼", 3),
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
      ...stamps,
    })),
    tags: [
      {
        id: ids.weeklyShop,
        householdId: ids.household,
        name: "Weekly shop",
        position: 0,
        ...stamps,
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
    fxRates: [
      {
        householdId: ids.household,
        base: "GBP",
        quote: "USD",
        on: "2026-01-01",
        rate: 1.25,
        source: "test",
        version: 1,
      },
    ],
  };
}

/**
 * A Finance runtime on memory persistence with `rows` bootstrapped and no
 * network: tests read the Outbox with `runtime.store.takeOutbox()`.
 */
export async function createTestReplica(
  rows: Partial<SyncRows> = testReplicaRows(),
) {
  const runtime = createFinanceRuntime({
    householdId: ids.household,
    persistence: createMemoryPersistence(),
    onUnauthorised: () => undefined,
    fetch: () => Promise.reject(new Error("No network in tests")),
  });
  const { store } = runtime;
  await store.load();
  store.startBootstrap({ household: testHousehold, transactionsFrom: null });
  for (const table of REPLICA_TABLE_NAMES) {
    const tableRows = rows[table];
    if (tableRows) store.applyBootstrapRows(table, tableRows);
  }
  store.finishBootstrap(10, new Set());
  return runtime;
}
