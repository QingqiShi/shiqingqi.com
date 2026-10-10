import { fxRateRepository } from "../db/repositories/fx-rate-repository.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import { reportSourceRepository } from "../db/repositories/report-source-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import type { ReportSource } from "./types.ts";

/**
 * Reads what the weekly Reports need from the database. `transactionsFrom`
 * limits the Transactions to the weeks asked for (null reads them all);
 * every balance day is read, because net worth needs the whole history.
 */
export async function loadReportSource(
  scope: RepositoryScope,
  range: { transactionsFrom: string | null; to: string },
): Promise<ReportSource> {
  const household = await householdRepository.find(scope);
  if (!household) throw new Error("Household not found");
  const [
    groups,
    accounts,
    balanceDays,
    fxRates,
    categories,
    payees,
    members,
    transactions,
  ] = await Promise.all([
    reportSourceRepository.listGroups(scope),
    reportSourceRepository.listAccounts(scope),
    reportSourceRepository.listBalanceDays(scope),
    fxRateRepository.list(scope),
    reportSourceRepository.listCategories(scope),
    reportSourceRepository.listPayees(scope),
    reportSourceRepository.listMembers(scope),
    reportSourceRepository.listTransactions(scope, {
      from: range.transactionsFrom,
      to: range.to,
    }),
  ]);
  return {
    baseCurrency: household.baseCurrency,
    groups,
    accounts,
    balanceDays,
    fxRates,
    categories,
    payees,
    members,
    transactions,
  };
}
