import { and, eq, gt, isNull } from "drizzle-orm";
import type { AnyPgColumn, TableConfig } from "drizzle-orm/pg-core";
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
import type { HouseholdTable } from "./household-rows.ts";
import type { RepositoryScope } from "./types.ts";

function changedSince(version: AnyPgColumn, since: number | null) {
  return since === null ? undefined : gt(version, since);
}

/**
 * The reader of a synced table. `liveOnBootstrap` is the `deletedAt` of a
 * table that grows without bound: a bootstrap (null `since`) skips its
 * deleted rows.
 */
function changedRows<C extends TableConfig>(
  table: HouseholdTable<C>,
  { liveOnBootstrap }: { liveOnBootstrap?: AnyPgColumn } = {},
) {
  return (scope: RepositoryScope, since: number | null) =>
    scope.db
      .select()
      .from(table)
      .where(
        and(
          eq(table.householdId, scope.householdId),
          changedSince(table.version, since),
          liveOnBootstrap && since === null
            ? isNull(liveOnBootstrap)
            : undefined,
        ),
      );
}

/**
 * One reader per synced table. Each returns the Household's rows that
 * changed after `since`, soft-deleted rows included so deletions reach the
 * Replica.
 */
export const syncReadRepository = {
  tables: {
    members: changedRows(members),
    accountGroups: changedRows(accountGroups),
    accounts: changedRows(accounts),
    valuations: changedRows(valuations, {
      liveOnBootstrap: valuations.deletedAt,
    }),
    categories: changedRows(categories),
    payees: changedRows(payees),
    tags: changedRows(tags),
    rules: changedRows(rules),
    transactions: changedRows(transactions, {
      liveOnBootstrap: transactions.deletedAt,
    }),
    entries: changedRows(entries, { liveOnBootstrap: entries.deletedAt }),
    transactionTags: changedRows(transactionTags, {
      liveOnBootstrap: transactionTags.deletedAt,
    }),
    accountBalanceDays: changedRows(accountBalanceDays, {
      liveOnBootstrap: accountBalanceDays.deletedAt,
    }),
    monthTotals: changedRows(monthTotals, {
      liveOnBootstrap: monthTotals.deletedAt,
    }),
    fxRates: changedRows(fxRates),
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
