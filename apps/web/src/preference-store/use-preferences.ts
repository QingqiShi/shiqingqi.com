import { useSyncExternalStore } from "react";
import { clearPreferences } from "./clear-preferences";
import { deletePreference } from "./delete-preference";
import { loadPreferencesContext } from "./load-preferences-context";
import { preferenceCache } from "./preference-cache";
import { subscribePreferences } from "./subscribe-preferences";

function getPreferencesSnapshot() {
  return preferenceCache.preferences;
}

/**
 * Reads the current preferences from the shared store and exposes mutators
 * for deleting individual items or clearing everything. Every write — whether
 * it originates from this hook, from `usePreferencePersistence` (when the AI
 * saves a preference), or from any future caller of the store's write
 * functions — propagates to every subscriber through `useSyncExternalStore`,
 * so the `PreferenceTrigger` count, the `PreferencePanel` list, and any other
 * consumer stay in sync without remounting.
 */
export function usePreferences() {
  const preferences = useSyncExternalStore(
    subscribePreferences,
    getPreferencesSnapshot,
    getPreferencesSnapshot,
  );

  async function remove(id: string) {
    try {
      await deletePreference(id);
    } catch {
      // IndexedDB may be unavailable (private browsing, quota exceeded).
      // Reload so the snapshot reflects the actual persisted state.
      await loadPreferencesContext();
    }
  }

  async function clearAll() {
    try {
      await clearPreferences();
    } catch {
      await loadPreferencesContext();
    }
  }

  return { preferences, remove, clearAll } as const;
}
