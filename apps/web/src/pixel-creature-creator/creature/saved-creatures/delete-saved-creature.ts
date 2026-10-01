import { readSavedCreatures } from "./read-saved-creatures";
import { writeSavedCreatures } from "./write-saved-creatures";

/** Drop one saved Creature by id, leaving the rest untouched. */
export function deleteSavedCreature(id: string): void {
  writeSavedCreatures(readSavedCreatures().filter((entry) => entry.id !== id));
}
