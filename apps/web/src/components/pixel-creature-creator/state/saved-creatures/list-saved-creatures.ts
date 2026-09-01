import { readSavedCreatures } from "./read-saved-creatures";
import type { SavedCreature } from "./types";

/** Every saved Creature, newest first. */
export function listSavedCreatures(): SavedCreature[] {
  return readSavedCreatures().sort((a, b) => b.savedAt - a.savedAt);
}
