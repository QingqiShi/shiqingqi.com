import "server-only";
import { getFinanceDb } from "../db/get-finance-db.ts";
import { refreshHouseholdExchangeRates } from "./refresh-exchange-rates.ts";

/** A failure is only logged: the daily cron tries again. */
export async function refreshExchangeRatesAfterPush(householdId: string) {
  try {
    await refreshHouseholdExchangeRates(getFinanceDb(), householdId, {
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
    });
  } catch (error) {
    console.error("Exchange rates failed after a push", error);
  }
}
