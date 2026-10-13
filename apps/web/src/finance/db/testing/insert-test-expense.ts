import { randomUUID } from "node:crypto";
import { entries, transactions } from "../schema.ts";
import type { FinanceDb } from "../types.ts";
import type { SeededHousehold } from "./seed-test-household.ts";

/**
 * Inserts a posted Groceries expense with one Entry straight into the tables,
 * past the write path, and returns the Transaction id.
 */
export async function insertTestExpense(
  db: FinanceDb,
  home: SeededHousehold,
  accountId: string,
  date: string,
  amountMinor: number,
) {
  const id = randomUUID();
  await db.insert(transactions).values({
    id,
    householdId: home.householdId,
    kind: "expense",
    date,
    amountMinor,
    categoryId: home.groceriesId,
    version: 1,
  });
  await db.insert(entries).values({
    id: randomUUID(),
    householdId: home.householdId,
    transactionId: id,
    accountId,
    date,
    amountMinor,
    version: 1,
  });
  return id;
}
