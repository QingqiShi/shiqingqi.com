import type { SavedCreature } from "#src/pixel-creature-creator/creature/saved-creatures/types.ts";
import { savedCreaturesCache } from "./saved-creatures-cache";

/** The saved Creatures, reference-stable for `useSyncExternalStore`. */
export function getSavedCreaturesSnapshot(): readonly SavedCreature[] {
  return savedCreaturesCache.snapshot;
}
