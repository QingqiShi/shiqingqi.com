import { listHouseholdIds } from "../db/list-household-ids.ts";
import type { FinanceDb } from "../db/types.ts";
import { financeJson } from "../http/finance-json.ts";
import { isCronAuthorised } from "../http/is-cron-authorised.ts";
import {
  collectHouseholdPairs,
  refreshExchangeRates,
  type RefreshExchangeRatesDependencies,
} from "./refresh-exchange-rates.ts";

interface ExchangeRatesCronDependencies extends RefreshExchangeRatesDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getCronSecret?: () => string | undefined;
}

export function makeExchangeRatesCronHandler(
  dependencies: ExchangeRatesCronDependencies,
) {
  const getCronSecret =
    dependencies.getCronSecret ?? (() => process.env.CRON_SECRET);
  return async function GET(request: Request) {
    if (!isCronAuthorised(request, getCronSecret())) {
      return financeJson({ error: "unauthorised" }, { status: 401 });
    }
    if (!dependencies.isConfigured()) {
      return financeJson({ error: "not-configured" }, { status: 503 });
    }
    const db = dependencies.getDb();
    const pairs = await collectHouseholdPairs(db, await listHouseholdIds(db));
    return financeJson(await refreshExchangeRates(db, pairs, dependencies));
  };
}
