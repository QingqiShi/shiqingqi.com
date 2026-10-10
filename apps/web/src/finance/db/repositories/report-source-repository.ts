import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import {
  accountBalanceDays,
  accountGroups,
  accounts,
  categories,
  members,
  payees,
  transactions,
} from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

/** The rows a weekly Report reads, each scoped to the Household. */
export const reportSourceRepository = {
  async listGroups(scope: RepositoryScope) {
    return scope.db
      .select({
        id: accountGroups.id,
        name: accountGroups.name,
        side: accountGroups.side,
        position: accountGroups.position,
      })
      .from(accountGroups)
      .where(
        and(
          eq(accountGroups.householdId, scope.householdId),
          isNull(accountGroups.deletedAt),
        ),
      );
  },

  async listAccounts(scope: RepositoryScope) {
    return scope.db
      .select({
        id: accounts.id,
        groupId: accounts.groupId,
        name: accounts.name,
        institution: accounts.institution,
        kind: accounts.kind,
        currency: accounts.currency,
        excludedFromNetWorth: accounts.excludedFromNetWorth,
        closedOn: accounts.closedOn,
        position: accounts.position,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          isNull(accounts.deletedAt),
        ),
      );
  },

  async listBalanceDays(scope: RepositoryScope) {
    return scope.db
      .select({
        accountId: accountBalanceDays.accountId,
        day: accountBalanceDays.day,
        balanceMinor: accountBalanceDays.balanceMinor,
      })
      .from(accountBalanceDays)
      .where(
        and(
          eq(accountBalanceDays.householdId, scope.householdId),
          isNull(accountBalanceDays.deletedAt),
        ),
      );
  },

  /** Every Category, deleted ones too, so an old Transaction still finds its name. */
  async listCategories(scope: RepositoryScope) {
    return scope.db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        name: categories.name,
        isSystem: categories.isSystem,
        position: categories.position,
      })
      .from(categories)
      .where(eq(categories.householdId, scope.householdId));
  },

  async listPayees(scope: RepositoryScope) {
    return scope.db
      .select({ id: payees.id, name: payees.name })
      .from(payees)
      .where(eq(payees.householdId, scope.householdId));
  },

  async listMembers(scope: RepositoryScope) {
    return scope.db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(eq(members.householdId, scope.householdId));
  },

  /** Live Transactions dated `from` to `to`, both included, oldest first. */
  async listTransactions(
    scope: RepositoryScope,
    range: { from: string | null; to: string },
  ) {
    return scope.db
      .select({
        id: transactions.id,
        kind: transactions.kind,
        status: transactions.status,
        date: transactions.date,
        amountMinor: transactions.amountMinor,
        categoryId: transactions.categoryId,
        payeeId: transactions.payeeId,
        memberId: transactions.memberId,
        needsReview: transactions.needsReview,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, scope.householdId),
          isNull(transactions.deletedAt),
          range.from === null ? undefined : gte(transactions.date, range.from),
          lte(transactions.date, range.to),
        ),
      )
      .orderBy(asc(transactions.date));
  },
};
