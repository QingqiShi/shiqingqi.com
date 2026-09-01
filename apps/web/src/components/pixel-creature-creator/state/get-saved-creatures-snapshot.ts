import type { SavedCreature } from "./saved-creatures/types";
import { savedCreaturesCache } from "./saved-creatures-cache";

/** The saved Creatures, reference-stable for `useSyncExternalStore`. */
export function getSavedCreaturesSnapshot(): readonly SavedCreature[] {
  return savedCreaturesCache.snapshot;
}
