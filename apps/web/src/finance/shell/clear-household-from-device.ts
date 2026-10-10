import { FINANCE_PAGES_CACHE } from "#src/pwa/runtime-caching/finance-pages-cache.ts";
import { reportsPersister } from "../queries/reports-persister.ts";
import { deleteReplicaDb } from "../replica/open-replica-db.ts";

/**
 * Deletes every copy of the Household's data on this device: the Replica,
 * the stored Reports and the stored Finance pages. It closes this tab's
 * Replica first. It rejects when one of them is not deleted, after it tried
 * all of them.
 */
export async function clearHouseholdFromDevice(
  householdId: string,
  replica: { close: () => void },
) {
  replica.close();
  const results = await Promise.allSettled([
    deleteReplicaDb(householdId),
    reportsPersister(householdId).clear(),
    "caches" in globalThis ? caches.delete(FINANCE_PAGES_CACHE) : null,
  ]);
  const errors: unknown[] = [];
  for (const result of results) {
    if (result.status === "rejected") errors.push(result.reason);
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, "Household data remains on this device");
  }
}
