import type { ReplicaSnapshot } from "../replica/types.ts";
import type { EntryRow } from "../sync/row-schemas.ts";

type EntriesByTransaction = ReadonlyMap<string, readonly EntryRow[]>;

const cache = new WeakMap<
  ReadonlyMap<string, EntryRow>,
  EntriesByTransaction
>();
let previous: EntriesByTransaction = new Map();

function sameEntries(a: readonly EntryRow[], b: readonly EntryRow[]) {
  return a.length === b.length && a.every((entry, at) => entry === b[at]);
}

/**
 * The live Entries of each Transaction, in their order. A Transaction whose
 * Entries did not change keeps its list, so a selector can cache by it.
 */
export function selectEntriesByTransaction(
  snapshot: ReplicaSnapshot,
): EntriesByTransaction {
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
  const result = new Map<string, readonly EntryRow[]>();
  for (const [transactionId, list] of grouped) {
    if (list.length > 1) list.sort((a, b) => a.position - b.position);
    const before = previous.get(transactionId);
    result.set(
      transactionId,
      before && sameEntries(before, list) ? before : list,
    );
  }
  cache.set(entries, result);
  previous = result;
  return result;
}
