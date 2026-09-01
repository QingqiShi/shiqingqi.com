import type { StoredPreference } from "./types";

// Stable empty reference so `useSyncExternalStore` sees reference equality
// when the cache is unloaded or resolves to an empty list — otherwise React
// treats every snapshot as a change and loops infinitely.
const EMPTY_PREFERENCES: ReadonlyArray<StoredPreference> = [];

let cachedPreferences: ReadonlyArray<StoredPreference> = EMPTY_PREFERENCES;
let cachedContext: string | null = null;
let cacheLoaded = false;
let pendingLoad: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

/**
 * The one in-memory view of the stored preferences: the array the UI renders,
 * the chat context string built from it, and the load in flight, which readers
 * that only need a settled cache can join. It is the only mutable state in
 * this store — every other module here is a pure function over it.
 */
export const preferenceCache = {
  get preferences(): ReadonlyArray<StoredPreference> {
    return cachedPreferences;
  },

  /** The chat context, or null until the first load has settled. */
  get context(): string | null {
    return cacheLoaded ? cachedContext : null;
  },

  get loaded(): boolean {
    return cacheLoaded;
  },

  /** The load in flight, or null once the latest one has settled. */
  get pendingLoad(): Promise<string | null> | null {
    return pendingLoad;
  },

  /**
   * Starts `read` and tracks it as the load in flight until it settles. A
   * writer always starts a fresh read: a load that began before its
   * transaction committed can still resolve with the old rows.
   */
  beginLoad(read: () => Promise<string | null>): Promise<string | null> {
    const load = read().finally(() => {
      if (pendingLoad === load) pendingLoad = null;
    });
    pendingLoad = load;
    return load;
  },

  /** Replaces both cached views and notifies every subscriber. */
  fill(preferences: ReadonlyArray<StoredPreference>, context: string | null) {
    cachedPreferences =
      preferences.length > 0 ? preferences : EMPTY_PREFERENCES;
    cachedContext = context;
    cacheLoaded = true;
    listeners.forEach((listener) => {
      listener();
    });
  },

  /** Registers a subscriber and returns its unsubscribe function. */
  addListener(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
