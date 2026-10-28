import { and, eq, inArray, sql } from "drizzle-orm";
import type { ProviderTransaction } from "../../bank/lunchflow/types.ts";
import { nameBasedUuid } from "../../ids/name-based-uuid.ts";
import { bankTransactions } from "../schema.ts";
import type { RepositoryScope, WriteScope } from "./types.ts";

export type BankTransactionRecord = typeof bankTransactions.$inferSelect;
type BankTransactionState = BankTransactionRecord["state"];

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
};
