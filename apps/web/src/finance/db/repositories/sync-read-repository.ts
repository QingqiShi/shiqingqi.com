import { and, eq, gt, isNull } from "drizzle-orm";
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
  payees,
  rules,
  tags,
  transactions,
  transactionTags,
  valuations,
} from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

/** A bootstrap (null `since`) skips the deleted rows of the tables that grow without bound. */
function liveOnBootstrap(
  since: number | null,
  deletedAt:
    | typeof valuations.deletedAt
    | typeof transactions.deletedAt
    | typeof entries.deletedAt
    | typeof transactionTags.deletedAt
    | typeof accountBalanceDays.deletedAt
    | typeof monthTotals.deletedAt,
) {
  return since === null ? isNull(deletedAt) : undefined;
}

function changedSince(version: AnyPgColumn, since: number | null) {
  return since === null ? undefined : gt(version, since);
}

/**
 * One reader per synced table. Each returns the Household's rows that
 * changed after `since`, soft-deleted rows included so deletions reach the
 * Replica.
 */
export const syncReadRepository = {
  tables: {
    members: (scope, since) =>
      scope.db
        .select()
        .from(members)
        .where(
          and(
            eq(members.householdId, scope.householdId),
            changedSince(members.version, since),
          ),
        ),
    accountGroups: (scope, since) =>
      scope.db
        .select()
        .from(accountGroups)
        .where(
          and(
            eq(accountGroups.householdId, scope.householdId),
            changedSince(accountGroups.version, since),
          ),
        ),
    accounts: (scope, since) =>
      scope.db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.householdId, scope.householdId),
            changedSince(accounts.version, since),
          ),
        ),
    valuations: (scope, since) =>
      scope.db
        .select()
        .from(valuations)
        .where(
          and(
            eq(valuations.householdId, scope.householdId),
            changedSince(valuations.version, since),
            liveOnBootstrap(since, valuations.deletedAt),
          ),
        ),
    categories: (scope, since) =>
      scope.db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.householdId, scope.householdId),
            changedSince(categories.version, since),
          ),
        ),
    payees: (scope, since) =>
      scope.db
        .select()
        .from(payees)
        .where(
          and(
            eq(payees.householdId, scope.householdId),
            changedSince(payees.version, since),
          ),
        ),
    tags: (scope, since) =>
      scope.db
        .select()
        .from(tags)
        .where(
          and(
            eq(tags.householdId, scope.householdId),
            changedSince(tags.version, since),
          ),
        ),
    rules: (scope, since) =>
      scope.db
        .select()
        .from(rules)
        .where(
          and(
            eq(rules.householdId, scope.householdId),
            changedSince(rules.version, since),
          ),
        ),
    transactions: (scope, since) =>
      scope.db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, scope.householdId),
            changedSince(transactions.version, since),
            liveOnBootstrap(since, transactions.deletedAt),
          ),
        ),
    entries: (scope, since) =>
      scope.db
        .select()
        .from(entries)
        .where(
          and(
            eq(entries.householdId, scope.householdId),
            changedSince(entries.version, since),
            liveOnBootstrap(since, entries.deletedAt),
          ),
        ),
    transactionTags: (scope, since) =>
      scope.db
        .select()
        .from(transactionTags)
        .where(
          and(
            eq(transactionTags.householdId, scope.householdId),
            changedSince(transactionTags.version, since),
            liveOnBootstrap(since, transactionTags.deletedAt),
          ),
        ),
    accountBalanceDays: (scope, since) =>
      scope.db
        .select()
        .from(accountBalanceDays)
        .where(
          and(
            eq(accountBalanceDays.householdId, scope.householdId),
            changedSince(accountBalanceDays.version, since),
            liveOnBootstrap(since, accountBalanceDays.deletedAt),
          ),
        ),
    monthTotals: (scope, since) =>
      scope.db
        .select()
        .from(monthTotals)
        .where(
          and(
            eq(monthTotals.householdId, scope.householdId),
            changedSince(monthTotals.version, since),
            liveOnBootstrap(since, monthTotals.deletedAt),
          ),
        ),
    fxRates: (scope, since) =>
      scope.db
        .select()
        .from(fxRates)
        .where(
          and(
            eq(fxRates.householdId, scope.householdId),
            changedSince(fxRates.version, since),
          ),
        ),
    bankLinks: (scope, since) =>
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
            changedSince(bankLinks.version, since),
          ),
        ),
  } satisfies Record<
    SyncTableName,
    (scope: RepositoryScope, since: number | null) => Promise<object[]>
  >,
};
