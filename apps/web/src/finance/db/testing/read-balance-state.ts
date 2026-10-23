import { and, eq, isNull } from "drizzle-orm";
import {
  balanceSeriesFromRows,
  type BalanceDayRow,
  type BalanceSeries,
} from "../../domain/balance/compute-balance-days.ts";
import { listHouseholdExchangeRates } from "../../exchange-rates/find-household-pairs.ts";
import { householdRepository } from "../repositories/household-repository.ts";
import { accountBalanceDays, accounts } from "../schema.ts";
import type { FinanceDb } from "../types.ts";
import { withHousehold } from "../with-household.ts";

/** The stored accounts, balance series and FX rates of a Household. */
export function readBalanceState(db: FinanceDb, householdId: string) {
  return withHousehold(db, householdId, async (scope) => {
    const { db } = scope;
    const household = await householdRepository.find(scope);
    if (!household) throw new Error("Household not found");
    const accountRows = await db
      .select({
        id: accounts.id,
        currency: accounts.currency,
        excludedFromNetWorth: accounts.excludedFromNetWorth,
        closedOn: accounts.closedOn,
      })
      .from(accounts)
      .where(
        and(eq(accounts.householdId, householdId), isNull(accounts.deletedAt)),
      );
    const dayRows = await db
      .select({
        accountId: accountBalanceDays.accountId,
        day: accountBalanceDays.day,
        balanceMinor: accountBalanceDays.balanceMinor,
      })
      .from(accountBalanceDays)
      .where(
        and(
          eq(accountBalanceDays.householdId, householdId),
          isNull(accountBalanceDays.deletedAt),
        ),
      );
    const exchangeRates = await listHouseholdExchangeRates(
      scope,
      household.baseCurrency,
    );

    const daysByAccount = new Map<string, BalanceDayRow[]>();
    for (const row of dayRows) {
      const list = daysByAccount.get(row.accountId) ?? [];
      list.push({ day: row.day, balanceMinor: row.balanceMinor });
      daysByAccount.set(row.accountId, list);
    }
    const seriesByAccount = new Map<string, BalanceSeries>();
    for (const [accountId, list] of daysByAccount) {
      seriesByAccount.set(accountId, balanceSeriesFromRows(list));
    }
    return { accounts: accountRows, seriesByAccount, exchangeRates };
  });
}
