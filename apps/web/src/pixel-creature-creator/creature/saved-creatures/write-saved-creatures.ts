import { PIXEL_CREATURE_CREATOR_SAVED_KEY } from "./constants";
import type { SavedCreature } from "./types";

/**
 * Replace the whole saved-Creature blob. Best-effort: quota-exceeded and
 * storage-disabled environments throw on access, and this never rethrows.
 */
export function writeSavedCreatures(entries: SavedCreature[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      PIXEL_CREATURE_CREATOR_SAVED_KEY,
      JSON.stringify(entries),
    );
  } catch {
    // Quota exceeded / storage disabled — best-effort, swallow.
  }
}
