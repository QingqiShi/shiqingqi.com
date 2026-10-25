import {
  and,
  eq,
  exists,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ProviderTransaction } from "../../bank/lunchflow/types.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import {
  bankLinks,
  bankTransactions,
  entries,
  transactions,
} from "../schema.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

export type BankTransactionRecord = typeof bankTransactions.$inferSelect;
type BankTransactionState = BankTransactionRecord["state"];

/** A Transaction a bank row may match: one with an Entry on the linked account, or on In transit. */
export interface MatchCandidateRow {
  transactionId: string;
  entryId: string;
  /** The Entry is on In transit, not on the linked account. */
  inTransit: boolean;
  status: "posted" | "expected";
  /** The Entry's date: the day the money moves on the linked account. */
  date: string;
  transactionDate: string;
  amountMinor: number;
  createdAt: Date;
}

/** How many rows one statement of `setMatched` writes. */
const MATCH_BATCH = 500;

export const bankTransactionRepository = {
  /** The link's bank rows. */
  async listForLink(scope: RepositoryScope, linkId: string) {
    return scope.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          eq(bankTransactions.linkId, linkId),
        ),
      )
      .orderBy(bankTransactions.date, bankTransactions.providerTxId);
  },

  /** Each bank row of the link, with only what the balance check needs. */
  async listBacking(scope: RepositoryScope, linkId: string) {
    return scope.db
      .select({
        date: bankTransactions.date,
        state: bankTransactions.state,
        transactionId: bankTransactions.transactionId,
      })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          eq(bankTransactions.linkId, linkId),
        ),
      );
  },

  /** The `new` rows of these links, by date. */
  async listOpen(scope: RepositoryScope, linkIds: readonly string[]) {
    if (linkIds.length === 0) return [];
    return scope.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          inArray(bankTransactions.linkId, [...linkIds]),
          eq(bankTransactions.state, "new"),
        ),
      )
      .orderBy(bankTransactions.date, bankTransactions.providerTxId);
  },

  async findByIds(scope: RepositoryScope, ids: readonly string[]) {
    if (ids.length === 0) return [];
    return scope.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          inArray(bankTransactions.id, [...ids]),
        ),
      );
  },

  /** Counts one more failed try to label each row. */
  async addLabelAttempt(scope: WriteScope, ids: readonly string[]) {
    if (ids.length === 0) return;
    await scope.db
      .update(bankTransactions)
      .set({
        labelAttempts: sql`${bankTransactions.labelAttempts} + 1`,
        version: scope.version,
      })
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          inArray(bankTransactions.id, [...ids]),
        ),
      );
  },

  /** The ids among `transactionIds` that a bank row is matched to. */
  async findLinkedTransactionIds(
    scope: RepositoryScope,
    transactionIds: readonly string[],
  ) {
    if (transactionIds.length === 0) return new Set<string>();
    const rows = await scope.db
      .select({ transactionId: bankTransactions.transactionId })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          inArray(bankTransactions.transactionId, [...transactionIds]),
        ),
      );
    return new Set(rows.flatMap((row) => row.transactionId ?? []));
  },

  async findByTransactionId(scope: RepositoryScope, transactionId: string) {
    return scope.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          eq(bankTransactions.transactionId, transactionId),
        ),
      );
  },

  /**
   * Stores the provider rows: a new one is inserted as `new`, a known one
   * takes the provider's latest date, amount and texts.
   */
  async upsert(
    scope: WriteScope,
    linkId: string,
    rows: readonly ProviderTransaction[],
    seenAt: Date,
  ) {
    if (rows.length === 0) return;
    await scope.db
      .insert(bankTransactions)
      .values(
        rows.map((row) => ({
          id: nameBasedUuid(`bank-transaction:${linkId}:${row.id}`),
          householdId: scope.householdId,
          linkId,
          providerTxId: row.id,
          date: row.date,
          amountMinor: row.amountMinor,
          currency: row.currency,
          merchant: row.merchant,
          description: row.description,
          raw: row.raw ?? {},
          firstSeenAt: seenAt,
          lastSeenAt: seenAt,
          version: scope.version,
        })),
      )
      .onConflictDoUpdate({
        target: [bankTransactions.linkId, bankTransactions.providerTxId],
        set: {
          date: sql`excluded.date`,
          amountMinor: sql`excluded.amount_minor`,
          currency: sql`excluded.currency`,
          merchant: sql`excluded.merchant`,
          description: sql`excluded.description`,
          raw: sql`excluded.raw`,
          lastSeenAt: sql`excluded.last_seen_at`,
        },
        setWhere: eq(bankTransactions.householdId, scope.householdId),
      });
  },

  async setState(
    scope: WriteScope,
    ids: readonly string[],
    state: BankTransactionState,
  ) {
    if (ids.length === 0) return;
    await scope.db
      .update(bankTransactions)
      .set({
        state,
        version: scope.version,
      })
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          inArray(bankTransactions.id, [...ids]),
        ),
      );
  },

  /** Marks each row as matched to its Transaction. */
  async setMatched(
    scope: WriteScope,
    matches: readonly { id: string; transactionId: string }[],
  ) {
    for (let start = 0; start < matches.length; start += MATCH_BATCH) {
      const batch = matches.slice(start, start + MATCH_BATCH);
      const cases = batch.map(
        (match) =>
          sql`when ${match.id}::uuid then ${match.transactionId}::uuid`,
      );
      await scope.db
        .update(bankTransactions)
        .set({
          state: "matched",
          transactionId: sql`case ${bankTransactions.id} ${sql.join(cases, sql` `)} end`,
          version: scope.version,
        })
        .where(
          and(
            eq(bankTransactions.householdId, scope.householdId),
            inArray(
              bankTransactions.id,
              batch.map((match) => match.id),
            ),
          ),
        );
    }
  },

  /**
   * Live Transactions with an Entry on `accountId` dated from `from` to `to`
   * that no row of this link matches yet. With `inTransitAccountId`, also
   * the Transactions with an Entry on that In transit account and none on
   * `accountId`, which a bank row can settle.
   */
  async findMatchCandidates(
    scope: RepositoryScope,
    linkId: string,
    accountId: string,
    range: { from: string; to: string },
    inTransitAccountId: string | null,
  ): Promise<MatchCandidateRow[]> {
    const linked = alias(entries, "linked_entries");
    const rows = await scope.db
      .select({
        transactionId: transactions.id,
        entryId: entries.id,
        entryAccountId: entries.accountId,
        status: transactions.status,
        date: entries.date,
        transactionDate: transactions.date,
        amountMinor: entries.amountMinor,
        createdAt: transactions.createdAt,
      })
      .from(entries)
      .innerJoin(transactions, eq(transactions.id, entries.transactionId))
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(transactions.householdId, scope.householdId),
          inTransitAccountId === null
            ? eq(entries.accountId, accountId)
            : or(
                eq(entries.accountId, accountId),
                and(
                  eq(entries.accountId, inTransitAccountId),
                  notExists(
                    scope.db
                      .select({ id: linked.id })
                      .from(linked)
                      .where(
                        and(
                          eq(linked.householdId, scope.householdId),
                          eq(linked.transactionId, transactions.id),
                          eq(linked.accountId, accountId),
                          isNull(linked.deletedAt),
                        ),
                      ),
                  ),
                ),
              ),
          isNull(entries.deletedAt),
          isNull(transactions.deletedAt),
          gte(entries.date, range.from),
          lte(entries.date, range.to),
          notExists(
            scope.db
              .select({ id: bankTransactions.id })
              .from(bankTransactions)
              .where(
                and(
                  eq(bankTransactions.householdId, scope.householdId),
                  eq(bankTransactions.linkId, linkId),
                  eq(bankTransactions.transactionId, transactions.id),
                ),
              ),
          ),
        ),
      );
    return rows.map(({ entryAccountId, ...row }) => ({
      ...row,
      inTransit: entryAccountId !== accountId,
    }));
  },

  /**
   * Live Transactions that a bank row backs and that may stand for an
   * occurrence of the Rule: each has a live Entry dated from `from` to `to`
   * with one of the template's `entries` accounts and amounts, and a bank row
   * of a Bank link on that account. Each one has no Rule, or has this Rule
   * but was not made by it. One row per Transaction, at its earliest such
   * Entry.
   */
  async findOccurrenceCandidates(
    scope: RepositoryScope,
    ruleId: string,
    templateEntries: readonly { accountId: string; amountMinor: number }[],
    range: { from: string; to: string },
  ) {
    if (templateEntries.length === 0) return [];
    const rows = await scope.db
      .select({
        transactionId: transactions.id,
        entryId: entries.id,
        ruleId: transactions.ruleId,
        status: transactions.status,
        date: entries.date,
        createdAt: transactions.createdAt,
      })
      .from(entries)
      .innerJoin(transactions, eq(transactions.id, entries.transactionId))
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(transactions.householdId, scope.householdId),
          isNull(entries.deletedAt),
          isNull(transactions.deletedAt),
          or(
            isNull(transactions.ruleId),
            and(
              eq(transactions.ruleId, ruleId),
              ne(transactions.source, "rule"),
            ),
          ),
          or(
            ...templateEntries.map((entry) =>
              and(
                eq(entries.accountId, entry.accountId),
                eq(entries.amountMinor, entry.amountMinor),
              ),
            ),
          ),
          gte(entries.date, range.from),
          lte(entries.date, range.to),
          exists(
            scope.db
              .select({ id: bankTransactions.id })
              .from(bankTransactions)
              .innerJoin(bankLinks, eq(bankLinks.id, bankTransactions.linkId))
              .where(
                and(
                  eq(bankTransactions.householdId, scope.householdId),
                  eq(bankLinks.householdId, scope.householdId),
                  eq(bankTransactions.transactionId, transactions.id),
                  eq(bankLinks.accountId, entries.accountId),
                ),
              ),
          ),
        ),
      )
      .orderBy(entries.date, entries.id);
    const seen = new Set<string>();
    return rows.filter((row) => {
      if (seen.has(row.transactionId)) return false;
      seen.add(row.transactionId);
      return true;
    });
  },
};
