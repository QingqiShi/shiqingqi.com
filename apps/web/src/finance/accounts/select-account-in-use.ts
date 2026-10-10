import type { ReplicaSnapshot } from "../replica/types.ts";

/**
 * Whether an Entry, a Valuation or a Bank link still uses the account. The
 * server refuses to delete such an account, so the person closes it.
 */
export function selectAccountInUse(
  snapshot: ReplicaSnapshot,
  accountId: string,
): boolean {
  const { entries, valuations, bankLinks } = snapshot.tables;
  for (const row of valuations.values()) {
    if (row.accountId === accountId && row.deletedAt === null) return true;
  }
  for (const row of bankLinks.values()) {
    if (row.accountId === accountId && row.deletedAt === null) return true;
  }
  for (const row of entries.values()) {
    if (row.accountId === accountId && row.deletedAt === null) return true;
  }
  return false;
}
