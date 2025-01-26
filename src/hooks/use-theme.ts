import { useSyncExternalStore } from "react";
import type { SupportedTheme } from "@/types";
import { startViewTransition } from "@/utils/start-view-transition";

const STORAGE_KEY = "theme";

const listeners: Set<() => void> = new Set();
function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

let themeSingleton: string | null = null;
async function setIsMenuShown(newTheme: SupportedTheme) {
  // The root transition was disabled by default in global.css to work around an Safari issue that causes a flicker
  // For the theme switching specifically, we enable it for better result.
  document.documentElement.style.viewTransitionName = "root";
  const transition = await startViewTransition(() => {
    themeSingleton = newTheme;
    localStorage.setItem(STORAGE_KEY, newTheme);
    listeners.forEach((listener) => listener());
  });
  await transition?.finished;
  document.documentElement.style.viewTransitionName = "";
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
