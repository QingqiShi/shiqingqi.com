import {
  createFxIndex,
  type FxIndex,
} from "../domain/balance/create-fx-index.ts";
import type {
  ReplicaExchangeRates,
  ReplicaSnapshot,
} from "../replica/types.ts";

const cache = new WeakMap<ReplicaExchangeRates, Map<string, FxIndex>>();

/** Converts any currency to the Household's base currency on a day. */
export function selectFxIndex(snapshot: ReplicaSnapshot): FxIndex {
  const rates = snapshot.exchangeRates;
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
