import { PIXEL_CREATURE_CREATOR_SAVED_KEY } from "./saved-creatures/constants";
import { savedCreaturesCache } from "./saved-creatures-cache";

/**
 * Subscribes to saved-Creature changes, for `useSyncExternalStore`. Also
 * listens for the browser `storage` event so writes made in another tab
 * arrive here without a reload. Returns an unsubscribe function.
 */
export function subscribeSavedCreatures(notify: () => void): () => void {
  const removeListener = savedCreaturesCache.addListener(notify);
  const onStorage = (event: StorageEvent) => {
    // `event.key === null` means storage was cleared (e.g. via DevTools or
    // `localStorage.clear()`); otherwise gate on the key we care about.
    if (event.key === null || event.key === PIXEL_CREATURE_CREATOR_SAVED_KEY) {
      savedCreaturesCache.invalidate();
      notify();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    removeListener();
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
