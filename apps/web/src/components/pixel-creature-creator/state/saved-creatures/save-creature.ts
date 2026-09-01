import type { CreatureDef } from "../creature-def-schema";
import { PIXEL_CREATURE_CREATOR_MAX_SAVED } from "./constants";
import { listSavedCreatures } from "./list-saved-creatures";
import type { SavedCreature } from "./types";
import { writeSavedCreatures } from "./write-saved-creatures";

/** Persist a Creature, evicting the oldest once the cap is reached. */
export function saveCreature(def: CreatureDef): SavedCreature {
  const entry: SavedCreature = {
    id: generateId(),
    def,
    savedAt: Date.now(),
  };
  // Sort newest first, prepend the new entry, then cap.
  const next = [entry, ...listSavedCreatures()];
  writeSavedCreatures(next.slice(0, PIXEL_CREATURE_CREATOR_MAX_SAVED));
  return entry;
}

function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (shouldn't happen
  // in modern browsers + jsdom but keeps the function total).
  return `pcc-${String(Date.now())}-${Math.random().toString(36).slice(2, 10)}`;
}
