import { eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { createHousehold } from "../../auth/create-household.ts";
import { householdRepository } from "../../db/repositories/household-repository.ts";
import { recomputeDerived } from "../../db/repositories/recompute-derived.ts";
import { transactionRepository } from "../../db/repositories/transaction-repository.ts";
import {
  accountGroups,
  accounts,
  categories,
  entries,
  fxRates,
  households,
  payeeAliases,
  payees,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../../db/schema.ts";
import type { FinanceDb } from "../../db/types.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../../domain/dates/today-in-time-zone.ts";
import { buildSyntheticRows } from "./build-synthetic-rows.ts";

const INSERT_CHUNK = 500;
/** `createHousehold` starts the clock at 1, so the seed is the first write after it. */
const SEED_VERSION = 2;

interface SyntheticHouseholdOptions {
  /** Years of history before `today`. */
  years?: number;
  /** Transactions in each year, rules and transfers included. */
  transactionsPerYear?: number;
  seed?: number;
  /** The household's day; history ends here. Defaults to today in London. */
  today?: string;
}

export interface SyntheticHousehold {
  householdId: string;
  memberIds: { alex: string; sam: string };
  version: number;
  today: string;
  counts: {
    accounts: number;
    transactions: number;
    entries: number;
    valuations: number;
  };
}

async function insertRows<T extends PgTable>(
  db: FinanceDb,
  table: T,
  rows: readonly T["$inferInsert"][],
) {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    await db.insert(table).values(rows.slice(i, i + INSERT_CHUNK));
  }
}

/**
 * Writes a made-up household for end-to-end tests, screenshots and speed
 * checks: "Home" with the members Alex (owner) and Sam, 17 accounts of every
 * kind, monthly valuations, a category tree, payees, rules with their
 * occurrences, card repayments, refunds, expected rows and bank rows to
 * review. The same seed and day give the same data. Nothing in it comes from
 * a real household.
 */
export async function seedSyntheticHousehold(
  db: FinanceDb,
  {
    years = 3,
    transactionsPerYear = 2000,
    seed = 1,
    today = todayInTimeZone(DEFAULT_HOUSEHOLD_TIME_ZONE),
  }: SyntheticHouseholdOptions = {},
): Promise<SyntheticHousehold> {
  return db.transaction(async (tx) => {
    const rows = buildSyntheticRows({
      years,
      transactionsPerYear,
      seed,
      today,
      version: SEED_VERSION,
    });
    const { householdId, memberIds, uncategorised } = rows;

    const existing = await tx
      .select({ id: households.id })
      .from(households)
      .where(eq(households.id, householdId));
    if (existing.length > 0) {
      throw new Error(
        `The synthetic household for seed ${String(seed)} already exists. Use another seed or an empty database.`,
      );
    }

    const created = await createHousehold(tx, {
      id: householdId,
      name: "Home",
      members: [
        { id: memberIds.alex, name: "Alex", role: "owner" },
        { id: memberIds.sam, name: "Sam", role: "member" },
      ],
    });
    // createHousehold picks random ids; fixed ids keep two seeded databases equal.
    await tx
      .update(categories)
      .set({ id: uncategorised.expense })
      .where(eq(categories.id, created.uncategorised.expense));
    await tx
      .update(categories)
      .set({ id: uncategorised.income })
      .where(eq(categories.id, created.uncategorised.income));

    const household = await householdRepository.lockForWrite({
      db: tx,
      householdId,
    });
    if (!household) throw new Error("The household was not created");
    if (household.clock + 1 !== SEED_VERSION) {
      throw new Error("A new household must start at clock 1");
    }
    const version = SEED_VERSION;

    await insertRows(tx, accountGroups, rows.accountGroups);
    await insertRows(tx, accounts, rows.accounts);
    await insertRows(
      tx,
      categories,
      rows.categories.filter((category) => !category.parentId),
    );
    await insertRows(
      tx,
      categories,
      rows.categories.filter((category) => category.parentId),
    );
    await insertRows(tx, payees, rows.payees);
    await insertRows(tx, payeeAliases, rows.payeeAliases);
    await insertRows(tx, tags, rows.tags);
    await insertRows(tx, rules, rows.rules);
    await insertRows(tx, valuations, rows.valuations);
    await insertRows(tx, transactions, rows.transactions);
    await insertRows(tx, entries, rows.entries);
    await insertRows(tx, transactionTags, rows.transactionTags);
    await insertRows(tx, fxRates, rows.fxRates);

    await householdRepository.setClock({ db: tx, householdId }, version);
    await transactionRepository.refreshSearchText(
      { db: tx, householdId, version },
      undefined,
    );
    await recomputeDerived(
      tx,
      householdId,
      { accounts: "all", months: "all" },
      version,
    );

    return {
      householdId,
      memberIds,
      version,
      today,
      counts: {
        accounts: rows.accounts.length,
        transactions: rows.transactions.length,
        entries: rows.entries.length,
        valuations: rows.valuations.length,
      },
    };
  });
}
