import type { ReplicaSnapshot } from "../replica/types.ts";
import type { TransactionTagRow } from "../sync/row-schemas.ts";

const cache = new WeakMap<
  ReadonlyMap<string, TransactionTagRow>,
  ReadonlyMap<string, readonly string[]>
>();

/** The Tag ids of each Transaction. */
export function selectTagIdsByTransaction(
  snapshot: ReplicaSnapshot,
): ReadonlyMap<string, readonly string[]> {
  const links = snapshot.tables.transactionTags;
  const cached = cache.get(links);
  if (cached) return cached;
  const grouped = new Map<string, string[]>();
  for (const link of links.values()) {
    if (link.deletedAt !== null) continue;
    const list = grouped.get(link.transactionId);
    if (list) list.push(link.tagId);
    else grouped.set(link.transactionId, [link.tagId]);
  }
  cache.set(links, grouped);
  return grouped;
}
