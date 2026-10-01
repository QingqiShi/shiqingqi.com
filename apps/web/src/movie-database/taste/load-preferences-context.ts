import { formatPreferencesContext } from "./format-preferences-context";
import { getAllPreferences } from "./get-all-preferences";
import { preferenceCache } from "./preference-cache";
import type { StoredPreference } from "./types";

/**
 * Reloads both cached views — the array the UI renders and the chat context
 * string — from IndexedDB, then notifies every subscriber. Called after each
 * successful write so readers see the new state without remounting.
 *
 * Returns the formatted context, or null when nothing is stored. Readers that
 * only need a settled cache join the load in flight through
 * `getPreferencesContextReady` instead of starting another read.
 */
export function loadPreferencesContext(): Promise<string | null> {
  return preferenceCache.beginLoad(async () => {
    let prefs: ReadonlyArray<StoredPreference>;
    try {
      prefs = await getAllPreferences();
    } catch {
      prefs = [];
    }
    preferenceCache.fill(prefs, formatPreferencesContext(prefs));
    return preferenceCache.context;
  });
}
