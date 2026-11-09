import type { PetCounters } from "#src/pet/types.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import type { BuddyKv } from "../store/types.ts";

/** The keys of the page's water and pat counts, in the order that `countersOf` reads them. */
export function careKeys(name: string) {
  return [buddyKeys.careFed(name), buddyKeys.carePatted(name)] as const;
}

function countOf(value: string | null | undefined) {
  const count = Number(value ?? 0);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

/** The counts that the values of `careKeys` hold; 0 for a key that is missing. */
export function countersOf([fed, patted]: readonly (
  string | null | undefined
)[]): PetCounters {
  return { fed: countOf(fed), patted: countOf(patted) };
}

/** The counts of each page in `names`, in that order, from one MGET. */
export async function readCareCounts(
  kv: BuddyKv,
  names: readonly string[],
): Promise<PetCounters[]> {
  if (names.length === 0) return [];
  const values = await kv.getMany(names.flatMap(careKeys));
  return names.map((_, index) => countersOf(values.slice(index * 2)));
}
