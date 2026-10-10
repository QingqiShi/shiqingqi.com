import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { makeMaterialiseCronHandler } from "#src/finance/rules/make-materialise-cron-handler.ts";

const handler = makeMaterialiseCronHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  now: () => new Date(),
});

export function GET(request: Request) {
  return handler(request);
}
