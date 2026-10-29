import type { ReplicaSnapshot } from "../replica/types.ts";
import type { AccountRow } from "../sync/row-schemas.ts";

const cache = new WeakMap<ReadonlyMap<string, AccountRow>, string[]>();

/** The currencies the Household's live accounts use, sorted; the same array until the accounts change. */
export function selectAccountCurrencies(snapshot: ReplicaSnapshot): string[] {
  const accounts = snapshot.tables.accounts;
  const cached = cache.get(accounts);
  if (cached) return cached;
  const currencies = new Set<string>();
  for (const account of accounts.values()) {
    if (account.deletedAt === null) currencies.add(account.currency);
  }
  const list = [...currencies].sort();
  cache.set(accounts, list);
  return list;
}
