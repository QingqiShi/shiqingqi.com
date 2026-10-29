import type { ReplicaSnapshot } from "../replica/types.ts";
import type { ValuationRow } from "../sync/row-schemas.ts";

const cache = new WeakMap<
  ReadonlyMap<string, ValuationRow>,
  ReadonlyMap<string, ValuationRow>
>();

/** Each account's newest live Valuation, by account id. */
export function selectLatestValuations(
  snapshot: ReplicaSnapshot,
): ReadonlyMap<string, ValuationRow> {
  const rows = snapshot.tables.valuations;
  const cached = cache.get(rows);
  if (cached) return cached;
  const latest = new Map<string, ValuationRow>();
  for (const valuation of rows.values()) {
    if (valuation.deletedAt !== null) continue;
    const current = latest.get(valuation.accountId);
    if (!current || valuation.on > current.on) {
      latest.set(valuation.accountId, valuation);
    }
  }
  cache.set(rows, latest);
  return latest;
}
