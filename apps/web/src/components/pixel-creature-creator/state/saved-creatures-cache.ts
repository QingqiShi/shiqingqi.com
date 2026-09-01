import { listSavedCreatures } from "./saved-creatures/list-saved-creatures";
import type { SavedCreature } from "./saved-creatures/types";

let cachedSnapshot: readonly SavedCreature[] | null = null;
const listeners = new Set<() => void>();

/**
 * The one in-memory view of the saved Creatures, plus the subscribers that
 * watch it. `useSyncExternalStore` needs a reference-stable snapshot, but
 * `listSavedCreatures()` parses JSON and returns a fresh array on every call,
 * so the parsed list is held here until something invalidates it. Every other
 * module in this store is a function over this object.
 */
export const savedCreaturesCache = {
  get snapshot(): readonly SavedCreature[] {
    cachedSnapshot ??= listSavedCreatures();
    return cachedSnapshot;
  },

  /** Drops the cached list so the next read parses storage again. */
  invalidate(): void {
    cachedSnapshot = null;
  },

  notifyListeners(): void {
    for (const listener of listeners) listener();
  },

  /** Registers a subscriber and returns its unsubscribe function. */
  addListener(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
