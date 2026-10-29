import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { makeExchangeRatesCronHandler } from "#src/finance/exchange-rates/make-exchange-rates-cron-handler.ts";

export const maxDuration = 300;

export const GET = makeExchangeRatesCronHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  fetch: (input, init) => fetch(input, init),
  now: () => new Date(),
});
