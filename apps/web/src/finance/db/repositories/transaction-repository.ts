import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  categories,
  entries,
  payees,
  rules,
  transactions,
  transactionTags,
} from "../schema.ts";
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
  fxRate?: number | null;
}

/** The text a search matches: the Payee name, the note and the Category name, in lower case. */
const searchTextExpression = sql<string>`lower(concat_ws(' ',
  (select ${payees.name} from ${payees} where ${payees.id} = ${transactions.payeeId} and ${payees.householdId} = ${transactions.householdId}),
  nullif(${transactions.note}, ''),
  (select ${categories.name} from ${categories} where ${categories.id} = ${transactions.categoryId} and ${categories.householdId} = ${transactions.householdId})
))`;

const now = sql`now()`;

export const transactionRepository = {
  async findById(scope: RepositoryScope, id: string) {
    const rows = await scope.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.id, id),
        ),
      );
    return rows.at(0);
  },

  async findEntries(scope: RepositoryScope, transactionId: string) {
    return scope.db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(entries.transactionId, transactionId),
          isNull(entries.deletedAt),
        ),
      )
      .orderBy(entries.position);
  },

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

  async findTagIds(scope: RepositoryScope, transactionId: string) {
    const rows = await scope.db
      .select({ tagId: transactionTags.tagId })
      .from(transactionTags)
      .where(
        and(
          eq(transactionTags.householdId, scope.householdId),
          eq(transactionTags.transactionId, transactionId),
          isNull(transactionTags.deletedAt),
        ),
      );
    return rows.map((row) => row.tagId);
  },

  /** Inserts the Transaction. False when the id is already used. */
  async insert(scope: WriteScope, row: NewTransaction) {
    const inserted = await scope.db
      .insert(transactions)
      .values({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      })
      .onConflictDoNothing({ target: transactions.id })
      .returning({ id: transactions.id });
    return inserted.length > 0;
  },

  async patch(scope: WriteScope, id: string, fields: TransactionFields) {
    await scope.db
      .update(transactions)
      .set({ ...fields, version: scope.version, updatedAt: now })
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.id, id),
        ),
      );
  },

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
          fxRate: entry.fxRate ?? null,
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
          fxRate: sql`excluded.fx_rate`,
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
