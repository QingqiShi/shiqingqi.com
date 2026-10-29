import { makeBalanceRepairCronHandler } from "#src/finance/balance-repair/make-balance-repair-cron-handler.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";

export const maxDuration = 300;

export const GET = makeBalanceRepairCronHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  now: () => new Date(),
});
