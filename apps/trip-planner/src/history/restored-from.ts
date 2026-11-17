import { stable } from "./summarize-change.ts";
import type { TripVersion } from "./trip-history.ts";

/**
 * The older version that each restored version puts back, by revision.
 * A version whose trip is the same as an older version's, but not the same
 * as the version right before it, is a restore of the newest such version.
 * `versions` is newest first, as the history lists them.
 */
export function restoredFrom(
  versions: readonly TripVersion[],
): Map<number, TripVersion> {
  const restores = new Map<number, TripVersion>();
  const newestWith = new Map<string, TripVersion>();
  versions.toReversed().forEach((version, index, oldestFirst) => {
    if (!version.trip) return;
    const key = stable(version.trip);
    const same = newestWith.get(key);
    if (same && same !== oldestFirst.at(index - 1)) {
      restores.set(version.revision, same);
    }
    newestWith.set(key, version);
  });
  return restores;
}
