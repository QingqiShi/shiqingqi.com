import { loadPreferencesContext } from "./load-preferences-context";
import { preferenceCache } from "./preference-cache";

/**
 * Subscribes to preference store changes. Intended for use with
 * `useSyncExternalStore`. Returns an unsubscribe function.
 *
 * Triggers a lazy initial load on the first subscriber so the snapshot
 * reflects persisted data without requiring callers to separately await
 * `getPreferencesContextReady`.
 */
export function subscribePreferences(listener: () => void): () => void {
  const unsubscribe = preferenceCache.addListener(listener);
  if (!preferenceCache.loaded && preferenceCache.pendingLoad === null) {
    void loadPreferencesContext();
  }
  return unsubscribe;
}
