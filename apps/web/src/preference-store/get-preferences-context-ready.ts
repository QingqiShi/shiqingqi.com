import { loadPreferencesContext } from "./load-preferences-context";
import { preferenceCache } from "./preference-cache";

/**
 * Returns a promise that resolves once the preference cache is populated
 * (or a load has settled). If no load has been started yet, one is kicked
 * off here. Safe to await before reading `preferenceCache.context`.
 *
 * This is the race-safe coordination point: concurrent callers share the
 * same in-flight load so the first chat message can reliably wait for
 * preferences without triggering duplicate IndexedDB reads.
 */
export function getPreferencesContextReady(): Promise<string | null> {
  if (preferenceCache.pendingLoad) return preferenceCache.pendingLoad;
  if (preferenceCache.loaded) return Promise.resolve(preferenceCache.context);
  return loadPreferencesContext();
}
