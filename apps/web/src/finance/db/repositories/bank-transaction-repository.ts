import {
  and,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  notExists,
  sql,
} from "drizzle-orm";
import type { ProviderTransaction } from "../../bank/lunchflow/types.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import { bankTransactions, entries, transactions } from "../schema.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

export type BankTransactionRecord = typeof bankTransactions.$inferSelect;
type BankTransactionState = BankTransactionRecord["state"];

/** A Transaction a bank row may match: one with an Entry on the linked account. */
export interface MatchCandidateRow {
  transactionId: string;
  status: "posted" | "expected";
  source: "manual" | "rule" | "bank" | "import";
  /** The Entry's date: the day the money moves on the linked account. */
  date: string;
  transactionDate: string;
  amountMinor: number;
  payeeId: string | null;
  createdAt: Date;
}

/** How many rows one statement of `setMatched` writes. */
const MATCH_BATCH = 500;

export const bankTransactionRepository = {
  /** The link's bank rows, from `fromDay` on when given. */
  async listForLink(scope: RepositoryScope, linkId: string, fromDay?: string) {
    return scope.db
      .select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.householdId, scope.householdId),
          eq(bankTransactions.linkId, linkId),
          fromDay === undefined
            ? undefined
            : gte(bankTransactions.date, fromDay),
        ),
      )
      .orderBy(bankTransactions.date, bankTransactions.providerTxId);
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
    transactionId?: string | null,
  ) {
    if (ids.length === 0) return;
    await scope.db
      .update(bankTransactions)
      .set({
        state,
        ...(transactionId === undefined ? {} : { transactionId }),
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
   * that no row of this link matches yet.
   */
  async findMatchCandidates(
    scope: RepositoryScope,
    linkId: string,
    accountId: string,
    range: { from: string; to: string },
  ): Promise<MatchCandidateRow[]> {
    return scope.db
      .select({
        transactionId: transactions.id,
        status: transactions.status,
        source: transactions.source,
        date: entries.date,
        transactionDate: transactions.date,
        amountMinor: entries.amountMinor,
        payeeId: transactions.payeeId,
        createdAt: transactions.createdAt,
      })
      .from(entries)
      .innerJoin(transactions, eq(transactions.id, entries.transactionId))
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(transactions.householdId, scope.householdId),
          eq(entries.accountId, accountId),
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
  },
};
