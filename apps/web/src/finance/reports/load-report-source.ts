import { householdRepository } from "../db/repositories/household-repository.ts";
import { reportSourceRepository } from "../db/repositories/report-source-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { createFxIndex } from "../domain/balance/create-fx-index.ts";
import { createTransactionAmount } from "../domain/transactions/create-transaction-amount.ts";
import { listHouseholdExchangeRates } from "../exchange-rates/find-household-pairs.ts";
import { isInReview } from "../transactions/is-in-review.ts";
import type { ReportSource } from "./types.ts";

/**
 * Reads what the weekly Reports need from the database. `transactionsFrom`
 * limits the Transactions to the weeks asked for (null reads them all);
 * every balance day is read, because net worth needs the whole history.
 * Whether a Transaction is in Review is decided as of `today`.
 */
export async function loadReportSource(
  scope: RepositoryScope,
  range: { transactionsFrom: string | null; to: string },
  today: string,
): Promise<ReportSource> {
  const household = await householdRepository.find(scope);
  if (!household) throw new Error("Household not found");
  const [
    groups,
    everyAccount,
    balanceDays,
    exchangeRates,
    categories,
    payees,
    members,
    transactions,
    amountEntries,
    inTransitEntries,
  ] = await Promise.all([
    reportSourceRepository.listGroups(scope),
    reportSourceRepository.listAccounts(scope),
    reportSourceRepository.listBalanceDays(scope),
    listHouseholdExchangeRates(scope, household.baseCurrency),
    reportSourceRepository.listCategories(scope),
    reportSourceRepository.listPayees(scope),
    reportSourceRepository.listMembers(scope),
    reportSourceRepository.listTransactions(scope, {
      from: range.transactionsFrom,
      to: range.to,
    }),
    reportSourceRepository.listAmountEntries(scope, {
      from: range.transactionsFrom,
      to: range.to,
    }),
    reportSourceRepository.listInTransitEntries(scope),
  ]);
  const everyAccountById = new Map(
    everyAccount.map((account) => [account.id, account]),
  );
  const accounts = everyAccount
    .filter((account) => account.deletedAt === null)
    .map(({ deletedAt: _deletedAt, ...account }) => account);
  const amountOf = createTransactionAmount(
    createFxIndex(exchangeRates, household.baseCurrency),
    (accountId) => everyAccountById.get(accountId),
  );
  const entriesByTransaction = Map.groupBy(
    amountEntries,
    (entry) => entry.transactionId,
  );
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const inTransitByTransaction = Map.groupBy(
    inTransitEntries,
    (entry) => entry.transactionId,
  );
  return {
    baseCurrency: household.baseCurrency,
    groups,
    accounts,
    balanceDays,
    exchangeRates,
    categories,
    payees,
    members,
    transactions: transactions.map(({ id, needsReview, ...transaction }) => ({
      ...transaction,
      amountMinor: amountOf(transaction, entriesByTransaction.get(id) ?? []),
      inReview: isInReview(
        { needsReview },
        inTransitByTransaction.get(id) ?? [],
        accountById,
        today,
      ),
    })),
  };
}
