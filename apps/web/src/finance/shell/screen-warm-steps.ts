import { selectAnalyticsIndex } from "../analytics/select-analytics-index.ts";
import type { ReplicaStore } from "../replica/create-replica-store.ts";
import { supportedTimeZones } from "../settings/supported-time-zones.ts";
import { timeZoneOptions } from "../settings/time-zone-options.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTagIdsByTransaction } from "../store/select-tag-ids-by-transaction.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import { selectQueueCounts } from "../transactions/select-queue-counts.ts";
import { selectTransactionLookups } from "../transactions/select-transaction-lookups.ts";

/** About 4 ms of `Intl.DateTimeFormat`s on a laptop; a phone takes a few times longer. */
const ZONES_PER_STEP = 30;

let zoneFormatsWarmed = false;

/** Creates the offset formats of every timezone, a few per step, once per page load, for the Household settings. */
function timeZoneSteps(): (() => void)[] {
  if (zoneFormatsWarmed) return [];
  zoneFormatsWarmed = true;
  const zones = supportedTimeZones();
  const steps: (() => void)[] = [];
  for (let at = 0; at < zones.length; at += ZONES_PER_STEP) {
    const some = zones.slice(at, at + ZONES_PER_STEP);
    steps.push(() => {
      timeZoneOptions("UTC", some);
    });
  }
  return steps;
}

/**
 * The work the Transactions, Analytics and Settings screens do first, one
 * short step each: the Replica selectors they read (each step reads the
 * newest snapshot and fills the selector's memo) and the timezone formats.
 */
export function screenWarmSteps(store: ReplicaStore): (() => void)[] {
  return [
    () => {
      selectTransactionsByDateDesc(store.getSnapshot());
    },
    () => {
      selectEntriesByTransaction(store.getSnapshot());
    },
    () => {
      selectTagIdsByTransaction(store.getSnapshot());
    },
    () => {
      selectTransactionLookups(store.getSnapshot());
    },
    () => {
      selectQueueCounts(store.getSnapshot());
    },
    () => {
      selectAnalyticsIndex(
        store.getSnapshot(),
        store.getMeta().transactionsFrom,
      );
    },
    ...timeZoneSteps(),
  ];
}
