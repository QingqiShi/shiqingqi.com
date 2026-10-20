import { and, eq, isNull } from "drizzle-orm";
import {
  balanceSeriesFromRows,
  type BalanceDayRow,
  type BalanceSeries,
} from "../../domain/balance/compute-balance-days.ts";
import { accountBalanceDays, accounts, fxRates } from "../schema.ts";
import type { FinanceDb } from "../types.ts";
import { withHousehold } from "../with-household.ts";

/** The stored accounts, balance series and FX rates of a Household. */
export function readBalanceState(db: FinanceDb, householdId: string) {
  return withHousehold(db, householdId, async ({ db }) => {
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
    const rateRows = await db
      .select({
        base: fxRates.base,
        quote: fxRates.quote,
        on: fxRates.on,
        rate: fxRates.rate,
      })
      .from(fxRates)
      .where(eq(fxRates.householdId, householdId));

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
    return { accounts: accountRows, seriesByAccount, fxRates: rateRows };
  });
}
