import type { ReplicaSnapshot } from "../replica/types.ts";
import type { ReportRow } from "../sync/row-schemas.ts";

const cache = new WeakMap<
  ReplicaSnapshot["tables"]["reports"],
  readonly ReportRow[]
>();

/** Every Report, newest week first. */
export function selectReportRows(
  snapshot: ReplicaSnapshot,
): readonly ReportRow[] {
  const rows = snapshot.tables.reports;
  const cached = cache.get(rows);
  if (cached) return cached;
  const sorted = [...rows.values()].sort((a, b) =>
    a.periodEnd === b.periodEnd ? 0 : a.periodEnd < b.periodEnd ? 1 : -1,
  );
  cache.set(rows, sorted);
  return sorted;
}
