import { encodeCreature } from "./encode-decode";
import {
  PIXEL_CREATURE_CREATOR_SAVED_KEY,
  type SavedCreature,
  listSavedCreatures,
} from "./local-storage";

/**
 * Tiny pub-sub used by `useSyncExternalStore` so consumers (the action row's
 * "Saved" indicator, the landing page's "Your creations" strip) refresh
 * after `saveCreature` / `deleteSavedCreature` runs without setting state
 * inside an effect. We also subscribe to the browser `storage` event so
 * mutations made in other tabs propagate here without a reload.
 *
 * Originally inlined in `review/action-row.tsx`; lifted into its own module
 * in Phase 6 so the landing-page client component can subscribe too.
 *
 * The snapshot used by `useSyncExternalStore` MUST be reference-stable until
 * the store actually mutates — `listSavedCreatures()` parses JSON on every
 * call and returns a fresh array, which would make React see a change every
 * render and infinite-loop. We cache the parsed list and invalidate only
 * when notified or when the cross-tab `storage` event fires.
 */
const savedListeners = new Set<() => void>();

let cachedSnapshot: readonly SavedCreature[] | null = null;

function readSnapshot(): readonly SavedCreature[] {
  if (cachedSnapshot === null) {
    cachedSnapshot = listSavedCreatures();
  }
  return cachedSnapshot;
}

function invalidate(): void {
  cachedSnapshot = null;
}

export function getSavedSnapshot(): readonly SavedCreature[] {
  return readSnapshot();
}

export function subscribeToSavedStore(notify: () => void): () => void {
  savedListeners.add(notify);
  const onStorage = (event: StorageEvent) => {
    // `event.key === null` means storage was cleared (e.g. via DevTools or
    // `localStorage.clear()`); otherwise gate on the key we care about.
    if (event.key === null || event.key === PIXEL_CREATURE_CREATOR_SAVED_KEY) {
      invalidate();
      notify();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    savedListeners.delete(notify);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function notifySavedStore(): void {
  invalidate();
  for (const listener of savedListeners) listener();
}

export function isSaved(encodedHash: string): boolean {
  if (typeof window === "undefined") return false;
  return readSnapshot().some(
    (entry) => encodeCreature(entry.def) === encodedHash,
  );
}
