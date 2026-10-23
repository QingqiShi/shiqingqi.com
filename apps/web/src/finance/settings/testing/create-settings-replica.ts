import type { SyncRows } from "../../sync/row-schemas.ts";
import {
  createTestReplica,
  TEST_IDS,
  testAccount,
  testCategory,
  testStamps,
} from "../../transactions/testing/create-test-replica.ts";

/** Fixed ids of the synthetic Household the Settings tests use. */
export const SETTINGS_IDS = {
  household: TEST_IDS.household,
  alex: TEST_IDS.alex,
  sam: TEST_IDS.sam,
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
  const member = (
    id: string,
    name: string,
    role: "owner" | "member",
    userId: string | null,
  ) => ({ id, householdId: ids.household, userId, name, role, ...testStamps });
  return {
    members: [
      member(ids.alex, "Alex", "owner", ids.alex),
      member(ids.sam, "Sam", "member", null),
      member(ids.kim, "Kim", "member", ids.kim),
    ],
    accountGroups: [
      { id: ids.cash, name: "Cash", side: "asset" as const, position: 0 },
      { id: ids.savings, name: "Savings", side: "asset" as const, position: 1 },
      { id: ids.cards, name: "Cards", side: "liability" as const, position: 2 },
    ].map((group) => ({ ...group, householdId: ids.household, ...testStamps })),
    accounts: [
      testAccount(ids.current, {
        groupId: ids.cash,
        ownerMemberId: ids.alex,
        name: "Current account",
        institution: "Monzo",
      }),
      testAccount(ids.visa, {
        groupId: ids.cards,
        ownerMemberId: ids.alex,
        name: "Alex Visa",
        institution: "Northbank",
        kind: "credit",
      }),
      testAccount(ids.brokerage, {
        groupId: ids.savings,
        ownerMemberId: ids.alex,
        name: "US Brokerage",
        institution: "Atlas",
        kind: "investment",
        currency: "USD",
      }),
    ],
    categories: [
      testCategory(ids.groceries, "Groceries", "expense", "", 0),
      testCategory(ids.dining, "Eating out", "expense", "", 0),
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
        ...testStamps,
      },
    ],
  };
}

/** A Replica runtime in memory, loaded with a small synthetic Household and never started. */
export function createSettingsReplica() {
  return createTestReplica(rows(), [
    {
      base: "USD",
      quote: "GBP",
      on: "2026-09-01",
      rate: 0.75,
      source: "household",
    },
  ]);
}
