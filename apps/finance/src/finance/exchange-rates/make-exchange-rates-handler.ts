import { householdRepository } from "../db/repositories/household-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import { financeJson } from "../http/finance-json.ts";
import {
  guardFinanceRequest,
  type FinanceRequestGuardDependencies,
} from "../http/guard-finance-request.ts";
import { refuseOtherRowShape } from "../sync/refuse-other-row-shape.ts";
import { REPLICA_ROW_SHAPE } from "../sync/replica-row-shape.ts";
import { withRowShape } from "../sync/with-row-shape.ts";
import {
  exchangeRateCursor,
  type ExchangeRateCursor,
} from "./exchange-rate-cursor.ts";
import { exchangeRateRepository } from "./exchange-rate-repository.ts";
import type { ExchangeRatesResponse } from "./exchange-rate-row-schema.ts";
import {
  findHouseholdPairs,
  householdPairsId,
} from "./find-household-pairs.ts";

interface ExchangeRatesHandlerDependencies extends FinanceRequestGuardDependencies {
  getDb: () => FinanceDb;
  rowShape?: number;
}

async function readRates(
  scope: RepositoryScope,
  since: ExchangeRateCursor | null,
): Promise<ExchangeRatesResponse> {
  const household = await householdRepository.find(scope);
  const pairs = household
    ? await findHouseholdPairs(scope, household.baseCurrency)
    : [];
  const pairsId = householdPairsId(pairs);
  const seq = await exchangeRateRepository.lastSeq(scope.db);
  const replace =
    since === null || since.pairsId !== pairsId || since.seq > seq;
  const rates = await exchangeRateRepository.listForPairs(
    scope.db,
    pairs,
    replace ? 0 : since.seq,
  );
  return {
    cursor: exchangeRateCursor.format({ seq, pairsId }),
    replace,
    rates,
  };
}

/** Follows the row shape handshake of `/api/sync`. */
export function makeExchangeRatesHandler(
  dependencies: ExchangeRatesHandlerDependencies,
) {
  const rowShape = dependencies.rowShape ?? REPLICA_ROW_SHAPE;
  return withRowShape(rowShape, async (request) => {
    const session = await guardFinanceRequest(dependencies, request, {
      write: false,
    });
    if (session instanceof Response) return session;
    const refused = refuseOtherRowShape(request, rowShape);
    if (refused) return refused;
    const since = exchangeRateCursor.parse(
      new URL(request.url).searchParams.get("since"),
    );
    return financeJson(
      await withHousehold(dependencies.getDb(), session.householdId, (scope) =>
        readRates(scope, since),
      ),
    );
  });
}
