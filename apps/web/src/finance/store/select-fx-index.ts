import {
  createFxIndex,
  type FxIndex,
} from "../domain/balance/create-fx-index.ts";
import type { ReplicaSnapshot } from "../replica/types.ts";
import type { FxRateRow } from "../sync/row-schemas.ts";

const cache = new WeakMap<
  ReadonlyMap<string, FxRateRow>,
  Map<string, FxIndex>
>();

/** Converts any currency to the Household's base currency on a day. */
export function selectFxIndex(snapshot: ReplicaSnapshot): FxIndex {
  const rates = snapshot.tables.fxRates;
  const base = snapshot.household?.baseCurrency ?? "GBP";
  let byBase = cache.get(rates);
  const cached = byBase?.get(base);
  if (cached) return cached;
  const index = createFxIndex([...rates.values()], base);
  if (!byBase) {
    byBase = new Map();
    cache.set(rates, byBase);
  }
  byBase.set(base, index);
  return index;
}
