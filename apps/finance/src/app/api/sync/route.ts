import { after } from "next/server";
import { getFinanceSession } from "#src/finance/auth/get-finance-session.ts";
import { getFinanceDb } from "#src/finance/db/get-finance-db.ts";
import { isFinanceConfigured } from "#src/finance/db/is-finance-configured.ts";
import { refreshExchangeRatesAfterPush } from "#src/finance/exchange-rates/refresh-exchange-rates-after-push.ts";
import { refreshInstitutionIconsAfterPush } from "#src/finance/institutions/institution-icon-sources.ts";
import { makeSyncHandlers } from "#src/finance/sync/make-sync-handlers.ts";

/** The work in `after()` uses this limit too. See `AFTER_PUSH_BUDGET_MS`. */
export const maxDuration = 180;

export const { GET, POST } = makeSyncHandlers({
  isConfigured: isFinanceConfigured,
  getDb: getFinanceDb,
  getSession: getFinanceSession,
  now: () => new Date(),
  afterPush: (householdId, effects) => {
    if (effects.has("institution-changed")) {
      after(() => refreshInstitutionIconsAfterPush(householdId));
    }
    if (effects.has("currency-changed")) {
      after(() => refreshExchangeRatesAfterPush(householdId));
    }
  },
});
