import { PIXEL_CREATURE_CREATOR_SAVED_KEY } from "./constants";

/** Remove every saved Creature. Best-effort when storage is unavailable. */
export function clearSavedCreatures(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PIXEL_CREATURE_CREATOR_SAVED_KEY);
  } catch {
    // Storage disabled — best-effort, swallow.
  }
}
