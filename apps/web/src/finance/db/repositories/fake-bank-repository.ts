import { and, eq, gte, inArray, isNull, ne } from "drizzle-orm";
import {
  accounts,
  bankTransactions,
  entries,
  payees,
  transactions,
} from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

/** Reads for the fake bank that dev and e2e use in place of Lunch Flow. */
export const fakeBankRepository = {
  /** Live cash and credit accounts: the ones a Bank link may bind. */
  async linkableAccounts(scope: RepositoryScope) {
    return scope.db
      .select({
        id: accounts.id,
        name: accounts.name,
        institution: accounts.institution,
        currency: accounts.currency,
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.householdId, scope.householdId),
          isNull(accounts.deletedAt),
          inArray(accounts.kind, ["cash", "credit"]),
        ),
      )
      .orderBy(accounts.position, accounts.name);
  },

  /** Posted Entries from `from` on that the bank did not create, with the Payee name. */
  async postedEntries(scope: RepositoryScope, from: string) {
    return scope.db
      .select({
        transactionId: transactions.id,
        accountId: entries.accountId,
        kind: transactions.kind,
        date: entries.date,
        amountMinor: entries.amountMinor,
        payeeName: payees.name,
        note: transactions.note,
      })
      .from(entries)
      .innerJoin(transactions, eq(transactions.id, entries.transactionId))
      .leftJoin(payees, eq(payees.id, transactions.payeeId))
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(transactions.householdId, scope.householdId),
          isNull(entries.deletedAt),
          isNull(transactions.deletedAt),
          eq(transactions.status, "posted"),
          ne(transactions.source, "bank"),
          gte(entries.date, from),
        ),
      )
      .orderBy(entries.date, transactions.createdAt);
  },

  /** Every provider transaction id the Household's links have stored. */
  async knownProviderIds(scope: RepositoryScope) {
    const rows = await scope.db
      .select({ id: bankTransactions.providerTxId })
      .from(bankTransactions)
      .where(eq(bankTransactions.householdId, scope.householdId));
    return new Set(rows.map((row) => row.id));
  },
};
