import {
  and,
  eq,
  getTableColumns,
  inArray,
  isNull,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { createHousehold } from "../../auth/create-household.ts";
import { householdRepository } from "../../db/repositories/household-repository.ts";
import { recomputeDerived } from "../../db/repositories/recompute-derived.ts";
import { transactionRepository } from "../../db/repositories/transaction-repository.ts";
import {
  accountGroups,
  accounts,
  appliedMutations,
  categories,
  entries,
  fxRates,
  members,
  payees,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../../db/schema.ts";
import type { FinanceDb } from "../../db/types.ts";
import type { ImportRows, MapOptions } from "./types.ts";

const CHUNK_ROWS = 500;

interface ImportOptions {
  options: MapOptions;
  householdName: string;
  /** Imports even when the app changed the Household; such changes to imported rows are lost. */
  force?: boolean;
}

/** The import stopped before it wrote anything, because it would undo changes made in the app. */
export class ImportRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportRefusedError";
  }
}

/** True when anything but an import wrote rows a re-import would overwrite: a pushed edit, or a manual or bank Transaction or Valuation. */
async function hasAppWrites(db: FinanceDb, householdId: string) {
  const pushed = await db
    .select({ id: appliedMutations.mutationId })
    .from(appliedMutations)
    .where(eq(appliedMutations.householdId, householdId))
    .limit(1);
  if (pushed.length > 0) return true;
  const transaction = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        inArray(transactions.source, ["manual", "bank"]),
      ),
    )
    .limit(1);
  if (transaction.length > 0) return true;
  const valuation = await db
    .select({ id: valuations.id })
    .from(valuations)
    .where(
      and(
        eq(valuations.householdId, householdId),
        inArray(valuations.source, ["manual", "bank"]),
      ),
    )
    .limit(1);
  return valuation.length > 0;
}

interface ImportResult {
  householdId: string;
  version: number;
  createdHousehold: boolean;
  /** Imported rows that the backup no longer has, now soft-deleted. */
  staleRows: number;
}

function chunked<T>(rows: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK_ROWS) {
    result.push(rows.slice(i, i + CHUNK_ROWS));
  }
  return result;
}

/**
 * `set` for an upsert: every column the import gives, from the proposed row,
 * plus the new version. A column the import leaves out (such as a payee's
 * merge or a row's deletion) keeps the household's value.
 */
function upsertSet(
  table: PgTable,
  rows: readonly object[],
  version: number,
  key: readonly string[],
) {
  const columns: Record<string, PgColumn> = getTableColumns(table);
  const given = new Set(rows.flatMap((row) => Object.keys(row)));
  const set: Record<string, SQL | number> = {};
  for (const [field, column] of Object.entries(columns)) {
    if (key.includes(field) || field === "householdId") continue;
    if (field === "createdAt") continue;
    if (field === "updatedAt") {
      set[field] = sql`now()`;
    } else if (field === "version") {
      set[field] = version;
    } else if (given.has(field)) {
      set[field] = sql.raw(`excluded."${column.name}"`);
    }
  }
  return set;
}

async function upsert(
  db: FinanceDb,
  table: PgTable,
  target: PgColumn[],
  rows: readonly object[],
  version: number,
) {
  const key = Object.entries(getTableColumns(table))
    .filter(([, column]) => target.includes(column))
    .map(([field]) => field);
  for (const chunk of chunked(rows.map((row) => ({ ...row, version })))) {
    await db
      .insert(table)
      .values(chunk)
      .onConflictDoUpdate({
        target,
        set: upsertSet(table, chunk, version, key),
      });
  }
}

/** Rows whose id is in `ids` must come before rows that point at them. */
function referencedFirst<T>(
  rows: readonly T[],
  pointsAt: (row: T) => string | null | undefined,
): T[] {
  return [
    ...rows.filter((row) => !pointsAt(row)),
    ...rows.filter((row) => pointsAt(row)),
  ];
}

async function softDeleteStale(
  db: FinanceDb,
  householdId: string,
  rows: ImportRows,
  version: number,
) {
  const deleted = { deletedAt: sql`now()`, updatedAt: sql`now()`, version };
  let count = 0;

  const importedTransactions = db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.source, "import"),
      ),
    );
  const transactionIds = rows.transactions.map((t) => t.id);
  const staleTransactions = await db
    .update(transactions)
    .set(deleted)
    .where(
      and(
        eq(transactions.householdId, householdId),
        eq(transactions.source, "import"),
        isNull(transactions.deletedAt),
        transactionIds.length > 0
          ? notInArray(transactions.id, transactionIds)
          : undefined,
      ),
    )
    .returning({ id: transactions.id });
  count += staleTransactions.length;

  const entryIds = rows.entries.map((e) => e.id);
  const staleEntries = await db
    .update(entries)
    .set(deleted)
    .where(
      and(
        eq(entries.householdId, householdId),
        isNull(entries.deletedAt),
        inArray(entries.transactionId, importedTransactions),
        entryIds.length > 0 ? notInArray(entries.id, entryIds) : undefined,
      ),
    )
    .returning({ id: entries.id });
  count += staleEntries.length;

  const valuationIds = rows.valuations.map((v) => v.id);
  const staleValuations = await db
    .update(valuations)
    .set(deleted)
    .where(
      and(
        eq(valuations.householdId, householdId),
        eq(valuations.source, "import"),
        isNull(valuations.deletedAt),
        valuationIds.length > 0
          ? notInArray(valuations.id, valuationIds)
          : undefined,
      ),
    )
    .returning({ id: valuations.id });
  count += staleValuations.length;

  const keep = new Set(
    rows.transactionTags.map((t) => `${t.transactionId}:${t.tagId}`),
  );
  const tagRows = await db
    .select({
      transactionId: transactionTags.transactionId,
      tagId: transactionTags.tagId,
    })
    .from(transactionTags)
    .where(
      and(
        eq(transactionTags.householdId, householdId),
        isNull(transactionTags.deletedAt),
        inArray(transactionTags.transactionId, importedTransactions),
      ),
    );
  for (const row of tagRows) {
    if (keep.has(`${row.transactionId}:${row.tagId}`)) continue;
    await db
      .update(transactionTags)
      .set({ deletedAt: sql`now()`, version })
      .where(
        and(
          eq(transactionTags.transactionId, row.transactionId),
          eq(transactionTags.tagId, row.tagId),
        ),
      );
    count++;
  }
  return count;
}

/**
 * Writes mapped MoneyThings rows into one household in one transaction:
 * creates the household and its members when they do not exist, upserts
 * every row by its import id with a new household version, soft-deletes
 * imported rows the backup no longer has, and builds the derived balances
 * and month totals again. Running it twice with the same rows gives the
 * same data. It refuses (`ImportRefusedError`) a Household that the app has
 * changed, unless `force` is set, because it would overwrite those changes.
 */
export async function importMoneyThings(
  db: FinanceDb,
  rows: ImportRows,
  { options, householdName, force = false }: ImportOptions,
): Promise<ImportResult> {
  const { householdId } = options;
  return db.transaction(async (tx) => {
    let household = await householdRepository.lockForWrite({
      db: tx,
      householdId,
    });
    if (household && !force && (await hasAppWrites(tx, householdId))) {
      throw new ImportRefusedError(
        `Household ${householdId} has changes made in the app. Importing again would undo the app's changes to imported rows. Pass --force to import anyway.`,
      );
    }
    let createdHousehold = false;
    if (!household) {
      await createHousehold(tx, {
        id: householdId,
        name: householdName,
        baseCurrency: options.baseCurrency,
        timezone: options.timeZone,
        members: [
          {
            id: options.memberIds.husband,
            name: options.memberNames.husband,
            role: "owner",
          },
          {
            id: options.memberIds.wife,
            name: options.memberNames.wife,
            role: "member",
          },
        ],
      });
      createdHousehold = true;
      household = await householdRepository.lockForWrite({
        db: tx,
        householdId,
      });
    }
    if (!household) throw new Error(`Household ${householdId} is missing`);
    const version = household.clock + 1;
    await householdRepository.setClock({ db: tx, householdId }, version);

    if (rows.members.length > 0) {
      await tx
        .insert(members)
        .values(rows.members.map((member) => ({ ...member, version })))
        .onConflictDoNothing();
    }

    const uncategorised = await tx
      .select({ id: categories.id, kind: categories.kind })
      .from(categories)
      .where(
        and(
          eq(categories.householdId, householdId),
          eq(categories.isSystem, true),
          isNull(categories.deletedAt),
        ),
      );
    const fallbackCategory = (kind: string) =>
      uncategorised.find((c) => c.kind === kind)?.id ?? null;

    await upsert(
      tx,
      accountGroups,
      [accountGroups.id],
      rows.accountGroups,
      version,
    );
    await upsert(
      tx,
      accounts,
      [accounts.id],
      referencedFirst(rows.accounts, (a) => a.defaultPaymentAccountId),
      version,
    );
    await upsert(
      tx,
      categories,
      [categories.id],
      referencedFirst(rows.categories, (c) => c.parentId),
      version,
    );
    await upsert(tx, payees, [payees.id], rows.payees, version);
    await upsert(tx, tags, [tags.id], rows.tags, version);
    await upsert(tx, rules, [rules.id], rows.rules, version);
    await upsert(tx, valuations, [valuations.id], rows.valuations, version);
    await upsert(
      tx,
      transactions,
      [transactions.id],
      referencedFirst(
        rows.transactions.map((t) =>
          t.kind !== "transfer" && !t.categoryId
            ? { ...t, categoryId: fallbackCategory(t.kind) }
            : t,
        ),
        (t) => t.refundOfId,
      ),
      version,
    );
    await upsert(tx, entries, [entries.id], rows.entries, version);
    await upsert(
      tx,
      transactionTags,
      [transactionTags.transactionId, transactionTags.tagId],
      rows.transactionTags.map((t) => ({ ...t, deletedAt: null })),
      version,
    );
    await upsert(
      tx,
      fxRates,
      [fxRates.householdId, fxRates.base, fxRates.quote, fxRates.on],
      rows.fxRates,
      version,
    );

    const staleRows = await softDeleteStale(tx, householdId, rows, version);
    const scope = { db: tx, householdId, version };
    await transactionRepository.refreshSearchText(scope, undefined);
    await recomputeDerived(
      tx,
      householdId,
      { accounts: "all", months: "all" },
      version,
    );
    return { householdId, version, createdHousehold, staleRows };
  });
}
