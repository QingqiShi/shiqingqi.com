import { bankLinks, categories, connections } from "../../db/schema.ts";
import type { SeededHousehold } from "../../db/testing/seed-test-household.ts";
import type { FinanceDb } from "../../db/types.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";

/** Adds the system "Uncategorised" pair that `createHousehold` makes and the test seed does not. */
export async function seedUncategorised(db: FinanceDb, home: SeededHousehold) {
  const ids = {
    expense: nameBasedUuid(`test:${home.householdId}:uncategorised:expense`),
    income: nameBasedUuid(`test:${home.householdId}:uncategorised:income`),
  };
  await db.insert(categories).values([
    {
      id: ids.expense,
      householdId: home.householdId,
      kind: "expense",
      name: "Uncategorised",
      isSystem: true,
      version: 0,
    },
    {
      id: ids.income,
      householdId: home.householdId,
      kind: "income",
      name: "Uncategorised",
      isSystem: true,
      version: 0,
    },
  ]);
  return ids;
}

/** A Bank link of `accountId` to `providerAccountId`, at version 0, never synced. */
export async function seedBankLink(
  db: FinanceDb,
  home: SeededHousehold,
  link: {
    accountId: string;
    providerAccountId: string;
    signMultiplier?: number;
  },
) {
  const connectionId = nameBasedUuid(`test:${home.householdId}:connection`);
  await db
    .insert(connections)
    .values({
      id: connectionId,
      householdId: home.householdId,
      label: "Lunch Flow",
      version: 0,
    })
    .onConflictDoNothing();
  const id = nameBasedUuid(`test:${home.householdId}:link:${link.accountId}`);
  await db.insert(bankLinks).values({
    id,
    householdId: home.householdId,
    connectionId,
    accountId: link.accountId,
    providerAccountId: link.providerAccountId,
    currency: "GBP",
    signMultiplier: link.signMultiplier ?? 1,
    version: 0,
  });
  return id;
}
