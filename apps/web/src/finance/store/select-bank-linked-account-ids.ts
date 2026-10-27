import type { ReplicaSnapshot } from "../replica/types.ts";
import { liveRowSelectors } from "./live-row-selectors.ts";

const cache = new WeakMap<readonly object[], ReadonlySet<string>>();

/**
 * The accounts with a live Bank link. Bank sync imports their real
 * Transactions, so a Rule on one of them does not post automatically.
 */
export function selectBankLinkedAccountIds(
  snapshot: ReplicaSnapshot,
): ReadonlySet<string> {
  const links = liveRowSelectors.bankLinks(snapshot);
  const cached = cache.get(links);
  if (cached) return cached;
  const ids = new Set(links.map((link) => link.accountId));
  cache.set(links, ids);
  return ids;
}
