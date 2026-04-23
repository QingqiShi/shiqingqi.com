import { useSyncExternalStore } from "react";
import type { SupportedTheme } from "#src/types.ts";

const STORAGE_KEY = "theme";

const listeners: Set<() => void> = new Set();
let themeSingleton: string | null = null;

function notifyListeners() {
  listeners.forEach((listener) => {
    listener();
  });
}

// Fires only in *other* tabs, never the tab that wrote. Updating
// `themeSingleton` here keeps `getSnapshot` from masking the new value.
function handleStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  themeSingleton = event.newValue;
  notifyListeners();
}

function subscribe(onStoreChange: () => void) {
  if (listeners.size === 0) {
    try {
      window.addEventListener("storage", handleStorage);
    } catch {
      // Defensive: environments without `window` shouldn't reach here, but
      // a throw must not prevent local subscriber registration.
    }
  }
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      try {
        window.removeEventListener("storage", handleStorage);
      } catch {
        // See above.
      }
    }
  };
}

function setTheme(newTheme: SupportedTheme) {
  themeSingleton = newTheme;
  try {
    localStorage.setItem(STORAGE_KEY, newTheme);
  } catch {
    // Safari private/lockdown mode and quota-exceeded throw here.
    // Keep the in-memory singleton and still notify subscribers so the
    // user's click is reflected in the UI for the session.
  }
  notifyListeners();
}

function getSupportedTheme(theme: string | null): SupportedTheme {
  return theme === "dark" || theme === "light" || theme === "system"
    ? theme
    : "system";
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => themeSingleton ?? localStorage.getItem(STORAGE_KEY),
    () => "system",
  );
  return [getSupportedTheme(theme), setTheme] as const;
}
