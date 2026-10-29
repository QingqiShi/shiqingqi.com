import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { makeWeeklyReportCronHandler } from "#src/finance/reports/make-weekly-report-cron-handler.ts";

export const maxDuration = 300;

export const GET = makeWeeklyReportCronHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  now: () => new Date(),
});
