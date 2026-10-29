import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { institutionIconSources } from "#src/finance/institutions/institution-icon-sources.ts";
import { makeInstitutionIconsCronHandler } from "#src/finance/institutions/make-institution-icons-cron-handler.ts";

export const maxDuration = 300;

export const GET = makeInstitutionIconsCronHandler({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  now: () => new Date(),
  ...institutionIconSources(),
});
