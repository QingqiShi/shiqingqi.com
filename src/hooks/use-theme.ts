import { useSyncExternalStore } from "react";
import type { SupportedTheme } from "#src/types.ts";

const STORAGE_KEY = "theme";

const listeners: Set<() => void> = new Set();
function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

let themeSingleton: string | null = null;
function setTheme(newTheme: SupportedTheme) {
  themeSingleton = newTheme;
  try {
    localStorage.setItem(STORAGE_KEY, newTheme);
  } catch {
    // Safari private/lockdown mode and quota-exceeded throw here.
    // Keep the in-memory singleton and still notify subscribers so the
    // user's click is reflected in the UI for the session.
  }
  listeners.forEach((listener) => {
    listener();
  });
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
