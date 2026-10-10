import type { ReplicaSnapshot } from "../replica/types.ts";
import type { EntryRow } from "../sync/row-schemas.ts";

const cache = new WeakMap<
  ReadonlyMap<string, EntryRow>,
  ReadonlyMap<string, readonly EntryRow[]>
>();

/** The live Entries of each Transaction, in their order. */
export function selectEntriesByTransaction(
  snapshot: ReplicaSnapshot,
): ReadonlyMap<string, readonly EntryRow[]> {
  const entries = snapshot.tables.entries;
  const cached = cache.get(entries);
  if (cached) return cached;
  const grouped = new Map<string, EntryRow[]>();
  for (const entry of entries.values()) {
    if (entry.deletedAt !== null) continue;
    const list = grouped.get(entry.transactionId);
    if (list) list.push(entry);
    else grouped.set(entry.transactionId, [entry]);
  }
  for (const list of grouped.values()) {
    if (list.length > 1) list.sort((a, b) => a.position - b.position);
  }
  cache.set(entries, grouped);
  return grouped;
}
