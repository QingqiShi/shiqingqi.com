import { savedCreaturesCache } from "./saved-creatures-cache";

/**
 * Refreshes every reader after `saveCreature` / `deleteSavedCreature`, so
 * consumers stay in sync without setting state inside an effect.
 */
export function notifySavedCreaturesChanged(): void {
  savedCreaturesCache.invalidate();
  savedCreaturesCache.notifyListeners();
}
