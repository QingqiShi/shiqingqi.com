import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  categories,
  entries,
  liveEntryColumns,
  payees,
  rules,
  transactions,
  transactionTags,
  type LiveEntryRow,
} from "../schema.ts";
import { householdRows, stamped } from "./household-rows.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

type NewTransaction = Omit<
  typeof transactions.$inferInsert,
  "householdId" | "version" | "searchText"
>;
type TransactionFields = Partial<
  Omit<NewTransaction, "id" | "createdAt" | "updatedAt" | "deletedAt">
>;

interface EntryValues {
  id: string;
  accountId: string;
  amountMinor: number;
}

/** The text a search matches: the Payee name, the note and the Category name, in lower case. */
const searchTextExpression = sql<string>`lower(concat_ws(' ',
  (select ${payees.name} from ${payees} where ${payees.id} = ${transactions.payeeId} and ${payees.householdId} = ${transactions.householdId}),
  nullif(${transactions.note}, ''),
  (select ${categories.name} from ${categories} where ${categories.id} = ${transactions.categoryId} and ${categories.householdId} = ${transactions.householdId})
))`;

const now = sql`now()`;

const transactionRows = householdRows(transactions);

export const transactionRepository = {
  findById: transactionRows.findById,

  /** The Entries of these Transactions, deleted ones included, for working out which balances changed. */
  async findEntryAccounts(scope: RepositoryScope, transactionIds: string[]) {
    if (transactionIds.length === 0) return [];
    return scope.db
      .select({ accountId: entries.accountId, date: entries.date })
      .from(entries)
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          inArray(entries.transactionId, transactionIds),
        ),
      );
  },

  /** The live Entries of these Transactions, in order, by Transaction id. */
  async findEntriesOf(scope: RepositoryScope, transactionIds: string[]) {
    const byTransaction = new Map<string, LiveEntryRow[]>();
    if (transactionIds.length === 0) return byTransaction;
    const rows = await scope.db
      .select(liveEntryColumns)
      .from(entries)
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          inArray(entries.transactionId, transactionIds),
          isNull(entries.deletedAt),
        ),
      )
      .orderBy(entries.position);
    for (const row of rows) {
      const list = byTransaction.get(row.transactionId) ?? [];
      list.push(row);
      byTransaction.set(row.transactionId, list);
    }
    return byTransaction;
  },

  /** The live Tag ids of these Transactions, by Transaction id. */
  async findTagIdsOf(scope: RepositoryScope, transactionIds: string[]) {
    const byTransaction = new Map<string, string[]>();
    if (transactionIds.length === 0) return byTransaction;
    const rows = await scope.db
      .select({
        transactionId: transactionTags.transactionId,
        tagId: transactionTags.tagId,
      })
      .from(transactionTags)
      .where(
        and(
          eq(transactionTags.householdId, scope.householdId),
          inArray(transactionTags.transactionId, transactionIds),
          isNull(transactionTags.deletedAt),
        ),
      );
    for (const row of rows) {
      const list = byTransaction.get(row.transactionId) ?? [];
      list.push(row.tagId);
      byTransaction.set(row.transactionId, list);
    }
    return byTransaction;
  },

  insert: (scope: WriteScope, row: NewTransaction) =>
    transactionRows.insert(scope, stamped(scope, row)),

  patch: (scope: WriteScope, id: string, fields: TransactionFields) =>
    transactionRows.patch(scope, id, fields),

  /**
   * Makes `values` the Transaction's Entries: updates the ones with a known
   * id, inserts the others and soft-deletes the rest. False when an Entry id
   * belongs to another Transaction.
   */
  async replaceEntries(
    scope: WriteScope,
    transactionId: string,
    date: string,
    values: readonly EntryValues[],
  ) {
    const written = await scope.db
      .insert(entries)
      .values(
        values.map((entry, position) => ({
          id: entry.id,
          householdId: scope.householdId,
          transactionId,
          accountId: entry.accountId,
          date,
          amountMinor: entry.amountMinor,
          position,
          version: scope.version,
        })),
      )
      .onConflictDoUpdate({
        target: entries.id,
        set: {
          accountId: sql`excluded.account_id`,
          date: sql`excluded.date`,
          amountMinor: sql`excluded.amount_minor`,
          position: sql`excluded.position`,
          version: scope.version,
          updatedAt: now,
          deletedAt: null,
        },
        setWhere: and(
          eq(entries.householdId, scope.householdId),
          eq(entries.transactionId, transactionId),
        ),
      })
      .returning({ id: entries.id });
    if (written.length !== values.length) return false;

    await scope.db
      .update(entries)
      .set({ deletedAt: now, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(entries.transactionId, transactionId),
          isNull(entries.deletedAt),
          notInArray(
            entries.id,
            values.map((entry) => entry.id),
          ),
        ),
      );
    return true;
  },

  async setEntryDates(scope: WriteScope, transactionId: string, date: string) {
    await scope.db
      .update(entries)
      .set({ date, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(entries.transactionId, transactionId),
          isNull(entries.deletedAt),
        ),
      );
  },

  /** Makes `tagIds` the Transaction's Tags; a removed Tag is soft-deleted so the removal syncs. */
  async replaceTags(
    scope: WriteScope,
    transactionId: string,
    tagIds: readonly string[],
  ) {
    if (tagIds.length > 0) {
      await scope.db
        .insert(transactionTags)
        .values(
          tagIds.map((tagId) => ({
            transactionId,
            tagId,
            householdId: scope.householdId,
            version: scope.version,
          })),
        )
        .onConflictDoUpdate({
          target: [transactionTags.transactionId, transactionTags.tagId],
          set: { version: scope.version, deletedAt: null },
          setWhere: isNotNull(transactionTags.deletedAt),
        });
    }
    await scope.db
      .update(transactionTags)
      .set({ deletedAt: now, version: scope.version })
      .where(
        and(
          eq(transactionTags.householdId, scope.householdId),
          eq(transactionTags.transactionId, transactionId),
          isNull(transactionTags.deletedAt),
          tagIds.length > 0
            ? notInArray(transactionTags.tagId, [...tagIds])
            : undefined,
        ),
      );
  },

  /** Soft-deletes the Transaction and its Entries with one timestamp, so a restore can find them. */
  async softDelete(scope: WriteScope, id: string) {
    await scope.db
      .update(entries)
      .set({ deletedAt: now, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(entries.transactionId, id),
          isNull(entries.deletedAt),
        ),
      );
    await scope.db
      .update(transactions)
      .set({ deletedAt: now, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.id, id),
          isNull(transactions.deletedAt),
        ),
      );
  },

  /** Restores the Transaction and the Entries deleted with it. */
  async restore(scope: WriteScope, id: string) {
    await scope.db
      .update(entries)
      .set({ deletedAt: null, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(entries.transactionId, id),
          eq(
            entries.deletedAt,
            sql`(select ${transactions.deletedAt} from ${transactions} where ${transactions.id} = ${id} and ${transactions.householdId} = ${scope.householdId})`,
          ),
        ),
      );
    await scope.db
      .update(transactions)
      .set({ deletedAt: null, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.id, id),
        ),
      );
  },

  /** A Rule's Transactions dated on or after `from`, deleted ones included. */
  async findOfRuleFrom(scope: RepositoryScope, ruleId: string, from: string) {
    return scope.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.ruleId, ruleId),
          gte(transactions.date, from),
        ),
      );
  },

  /** A Rule's Transactions, deleted ones included, dated on one of `days` or with one of `ids`. */
  async findOfRuleOnDaysOrIds(
    scope: RepositoryScope,
    ruleId: string,
    days: string[],
    ids: string[],
  ) {
    return scope.db
      .select({ id: transactions.id, date: transactions.date })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.ruleId, ruleId),
          or(inArray(transactions.date, days), inArray(transactions.id, ids)),
        ),
      );
  },

  /** Soft-deletes a Rule's Expected Transactions that are not confirmed yet. */
  async softDeleteExpectedOfRule(scope: WriteScope, ruleId: string) {
    const deleted = await scope.db
      .update(transactions)
      .set({ deletedAt: now, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.ruleId, ruleId),
          eq(transactions.status, "expected"),
          isNull(transactions.deletedAt),
        ),
      )
      .returning({ id: transactions.id });
    if (deleted.length === 0) return;
    await scope.db
      .update(entries)
      .set({ deletedAt: now, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          inArray(
            entries.transactionId,
            deleted.map((row) => row.id),
          ),
          isNull(entries.deletedAt),
        ),
      );
  },

  /** Posts the Expected Transactions of `auto_post` Rules that are due by `today`. */
  async postDueAutoPost(scope: WriteScope, today: string) {
    return scope.db
      .update(transactions)
      .set({ status: "posted", version: scope.version, updatedAt: now })
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.status, "expected"),
          isNull(transactions.deletedAt),
          lte(transactions.date, today),
          inArray(
            transactions.ruleId,
            scope.db
              .select({ id: rules.id })
              .from(rules)
              .where(
                and(
                  eq(rules.householdId, scope.householdId),
                  eq(rules.autoPost, true),
                  isNull(rules.pausedAt),
                  isNull(rules.deletedAt),
                ),
              ),
          ),
        ),
      )
      .returning({ id: transactions.id, date: transactions.date });
  },

  /** Re-points every Transaction from one Payee to another. */
  async repointPayee(scope: WriteScope, fromId: string, intoId: string) {
    await scope.db
      .update(transactions)
      .set({ payeeId: intoId, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.payeeId, fromId),
        ),
      );
  },

  /**
   * Brings `search_text` up to date on the Transactions `where` selects. Only
   * rows whose text changes get a new version.
   */
  async refreshSearchText(scope: WriteScope, where: SQL | undefined) {
    await scope.db
      .update(transactions)
      .set({
        searchText: searchTextExpression,
        version: scope.version,
        updatedAt: now,
      })
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          where,
          sql`${transactions.searchText} is distinct from ${searchTextExpression}`,
        ),
      );
  },
};
