import { and, count, eq, gt, gte, inArray, isNull, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { SyncTableName } from "../../sync/row-schemas.ts";
import {
  accountBalanceDays,
  accountGroups,
  accounts,
  bankLinks,
  categories,
  entries,
  fxRates,
  members,
  monthTotals,
  payeeAliases,
  payees,
  reports,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

export interface SyncReadOptions {
  /**
   * Rows with a version above this. Null is a bootstrap: every row, except
   * the deleted rows of the large tables.
   */
  since: number | null;
  /** When set, only Transactions on or after this day, plus every Expected one. */
  transactionsFrom: string | null;
  /** When set, only balances on or after this day, plus each account's last one before it. */
  balanceDaysFrom: string | null;
}

function liveOnBootstrap(
  options: SyncReadOptions,
  deletedAt:
    | typeof valuations.deletedAt
    | typeof transactions.deletedAt
    | typeof entries.deletedAt
    | typeof transactionTags.deletedAt
    | typeof accountBalanceDays.deletedAt
    | typeof monthTotals.deletedAt,
) {
  return options.since === null ? isNull(deletedAt) : undefined;
}

function changedSince(version: AnyPgColumn, options: SyncReadOptions) {
  return options.since === null ? undefined : gt(version, options.since);
}

function windowedTransactionIds(
  scope: RepositoryScope,
  transactionsFrom: string,
) {
  return scope.db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, scope.householdId),
        or(
          gte(transactions.date, transactionsFrom),
          eq(transactions.status, "expected"),
        ),
      ),
    );
}

/**
 * One reader per synced table. Each returns the Household's rows that
 * changed after `since`, soft-deleted rows included so deletions reach the
 * Replica.
 */
export const syncReadRepository = {
  async countPostedTransactions(scope: RepositoryScope) {
    const rows = await scope.db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          eq(transactions.status, "posted"),
          isNull(transactions.deletedAt),
        ),
      );
    return rows.at(0)?.value ?? 0;
  },

  async countBalanceDays(scope: RepositoryScope) {
    const rows = await scope.db
      .select({ value: count() })
      .from(accountBalanceDays)
      .where(
        and(
          eq(accountBalanceDays.householdId, scope.householdId),
          isNull(accountBalanceDays.deletedAt),
        ),
      );
    return rows.at(0)?.value ?? 0;
  },

  tables: {
    members: (scope, options) =>
      scope.db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, scope.householdId),
            changedSince(members.version, options),
          ),
        ),
    accountGroups: (scope, options) =>
      scope.db
        .select()
        .from(accountGroups)
        .where(
          and(
            eq(accountGroups.householdId, scope.householdId),
            changedSince(accountGroups.version, options),
          ),
        ),
    accounts: (scope, options) =>
      scope.db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.householdId, scope.householdId),
            changedSince(accounts.version, options),
          ),
        ),
    valuations: (scope, options) =>
      scope.db
        .select()
        .from(valuations)
        .where(
          and(
            eq(valuations.householdId, scope.householdId),
            changedSince(valuations.version, options),
            liveOnBootstrap(options, valuations.deletedAt),
          ),
        ),
    categories: (scope, options) =>
      scope.db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.householdId, scope.householdId),
            changedSince(categories.version, options),
          ),
        ),
    payees: (scope, options) =>
      scope.db
        .select()
        .from(payees)
        .where(
          and(
            eq(payees.householdId, scope.householdId),
            changedSince(payees.version, options),
          ),
        ),
    payeeAliases: (scope, options) =>
      scope.db
        .select()
        .from(payeeAliases)
        .where(
          and(
            eq(payeeAliases.householdId, scope.householdId),
            changedSince(payeeAliases.version, options),
          ),
        ),
    tags: (scope, options) =>
      scope.db
        .select()
        .from(tags)
        .where(
          and(
            eq(tags.householdId, scope.householdId),
            changedSince(tags.version, options),
          ),
        ),
    rules: (scope, options) =>
      scope.db
        .select()
        .from(rules)
        .where(
          and(
            eq(rules.householdId, scope.householdId),
            changedSince(rules.version, options),
          ),
        ),
    transactions: (scope, options) =>
      scope.db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, scope.householdId),
            changedSince(transactions.version, options),
            liveOnBootstrap(options, transactions.deletedAt),
            options.transactionsFrom === null
              ? undefined
              : or(
                  gte(transactions.date, options.transactionsFrom),
                  eq(transactions.status, "expected"),
                ),
          ),
        ),
    entries: (scope, options) =>
      scope.db
        .select()
        .from(entries)
        .where(
          and(
            eq(entries.householdId, scope.householdId),
            changedSince(entries.version, options),
            liveOnBootstrap(options, entries.deletedAt),
            options.transactionsFrom === null
              ? undefined
              : inArray(
                  entries.transactionId,
                  windowedTransactionIds(scope, options.transactionsFrom),
                ),
          ),
        ),
    transactionTags: (scope, options) =>
      scope.db
        .select()
        .from(transactionTags)
        .where(
          and(
            eq(transactionTags.householdId, scope.householdId),
            changedSince(transactionTags.version, options),
            liveOnBootstrap(options, transactionTags.deletedAt),
            options.transactionsFrom === null
              ? undefined
              : inArray(
                  transactionTags.transactionId,
                  windowedTransactionIds(scope, options.transactionsFrom),
                ),
          ),
        ),
    accountBalanceDays: (scope, options) =>
      scope.db
        .select()
        .from(accountBalanceDays)
        .where(
          and(
            eq(accountBalanceDays.householdId, scope.householdId),
            changedSince(accountBalanceDays.version, options),
            liveOnBootstrap(options, accountBalanceDays.deletedAt),
            options.balanceDaysFrom === null
              ? undefined
              : or(
                  gte(accountBalanceDays.day, options.balanceDaysFrom),
                  sql`(${accountBalanceDays.accountId}, ${accountBalanceDays.day}) in (
                    select ${accountBalanceDays.accountId}, max(${accountBalanceDays.day})
                    from ${accountBalanceDays}
                    where ${accountBalanceDays.householdId} = ${scope.householdId}
                      and ${accountBalanceDays.deletedAt} is null
                      and ${accountBalanceDays.day} < ${options.balanceDaysFrom}
                    group by ${accountBalanceDays.accountId})`,
                ),
          ),
        ),
    monthTotals: (scope, options) =>
      scope.db
        .select()
        .from(monthTotals)
        .where(
          and(
            eq(monthTotals.householdId, scope.householdId),
            changedSince(monthTotals.version, options),
            liveOnBootstrap(options, monthTotals.deletedAt),
          ),
        ),
    fxRates: (scope, options) =>
      scope.db
        .select()
        .from(fxRates)
        .where(
          and(
            eq(fxRates.householdId, scope.householdId),
            changedSince(fxRates.version, options),
          ),
        ),
    bankLinks: (scope, options) =>
      scope.db
        .select({
          id: bankLinks.id,
          householdId: bankLinks.householdId,
          accountId: bankLinks.accountId,
          providerName: bankLinks.providerName,
          providerInstitution: bankLinks.providerInstitution,
          currency: bankLinks.currency,
          lastSyncedOn: bankLinks.lastSyncedOn,
          lastSyncAt: bankLinks.lastSyncAt,
          lastError: bankLinks.lastError,
          status: bankLinks.status,
          bankBalanceMinor: bankLinks.bankBalanceMinor,
          bankBalanceOn: bankLinks.bankBalanceOn,
          balanceDifferenceMinor: bankLinks.balanceDifferenceMinor,
          version: bankLinks.version,
          deletedAt: bankLinks.deletedAt,
        })
        .from(bankLinks)
        .where(
          and(
            eq(bankLinks.householdId, scope.householdId),
            changedSince(bankLinks.version, options),
          ),
        ),
    reports: (scope, options) =>
      scope.db
        .select({
          id: reports.id,
          householdId: reports.householdId,
          periodStart: reports.periodStart,
          periodEnd: reports.periodEnd,
          generatedAt: reports.generatedAt,
          version: reports.version,
        })
        .from(reports)
        .where(
          and(
            eq(reports.householdId, scope.householdId),
            changedSince(reports.version, options),
          ),
        ),
  } satisfies Record<
    SyncTableName,
    (scope: RepositoryScope, options: SyncReadOptions) => Promise<object[]>
  >,
};
