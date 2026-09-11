import type { ChangeStore } from "@tuja/component-tinker";

export function saveSnapshot(key: string, store: ChangeStore): void {
  const snapshot = store.snapshot();
  const isEmpty =
    Object.keys(snapshot.overrides).length === 0 &&
    Object.keys(snapshot.toggles).length === 0;
  try {
    if (isEmpty) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    /* Nothing to do: the edits are still in memory and in the export. */
  }
}
