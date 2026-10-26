import { and, eq, getTableColumns, gt, isNull } from "drizzle-orm";
import type { AnyPgColumn, TableConfig } from "drizzle-orm/pg-core";
import {
  LIVE_ON_BOOTSTRAP_TABLES,
  type SyncTableName,
} from "../../sync/row-schemas.ts";
import {
  accountBalanceDays,
  accountGroups,
  accounts,
  bankLinks,
  categories,
  entries,
  liveEntryColumns,
  liveTransactionColumns,
  members,
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
 * The reader of a synced table. A bootstrap (null `since`) skips the
 * deleted rows of a table in `LIVE_ON_BOOTSTRAP_TABLES`.
 */
function changedRows<C extends TableConfig>(
  name: SyncTableName,
  table: HouseholdTable<C> & { deletedAt: AnyPgColumn },
  columns: Record<string, AnyPgColumn> = getTableColumns(table),
) {
  const liveOnBootstrap = LIVE_ON_BOOTSTRAP_TABLES.has(name)
    ? table.deletedAt
    : undefined;
  return (scope: RepositoryScope, since: number | null) =>
    scope.db
      .select(columns)
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
    members: changedRows("members", members),
    accountGroups: changedRows("accountGroups", accountGroups),
    accounts: changedRows("accounts", accounts),
    valuations: changedRows("valuations", valuations),
    categories: changedRows("categories", categories),
    payees: changedRows("payees", payees),
    tags: changedRows("tags", tags),
    rules: changedRows("rules", rules),
    transactions: changedRows(
      "transactions",
      transactions,
      liveTransactionColumns,
    ),
    entries: changedRows("entries", entries, liveEntryColumns),
    transactionTags: changedRows("transactionTags", transactionTags),
    accountBalanceDays: changedRows("accountBalanceDays", accountBalanceDays),
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
