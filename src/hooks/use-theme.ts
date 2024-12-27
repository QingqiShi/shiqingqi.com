import { useSyncExternalStore } from "react";
import type { SupportedTheme } from "../types";

const STORAGE_KEY = "theme";

const listeners: Set<() => void> = new Set();
function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

let themeSingleton: string | null = null;
function setIsMenuShown(newTheme: SupportedTheme) {
  themeSingleton = newTheme;
  localStorage.setItem(STORAGE_KEY, newTheme);
  listeners.forEach((listener) => { listener(); });
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
    () => "system"
  );
  return [getSupportedTheme(theme), setIsMenuShown] as const;
}
