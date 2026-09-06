import type { ChangeStore, StoreSnapshot } from "@tuja/component-playground";

/** Autosave never matters more than the page working, so it stays silent. */
export function loadSnapshot(key: string, store: ChangeStore): void {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return;
    store.hydrate(JSON.parse(saved) as StoreSnapshot);
  } catch {
    /* A blocked or corrupt store leaves the config's own values. */
  }
}
