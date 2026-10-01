import { describe, expect, it } from "vitest";
import { loadPreferencesContext } from "./load-preferences-context";
import { preferenceCache } from "./preference-cache";
import { subscribePreferences } from "./subscribe-preferences";

describe("subscribePreferences", () => {
  // The subscribe/notify pair is what bridges writers (the AI's
  // `save_preference` tool call via `mergePreferences`) and readers
  // (`usePreferences` in `PreferenceManager`). Without this, the panel's
  // count dot and list stay stale until the component remounts — the bug
  // fixed here. These tests pin the contract: returned unsubscribe, stable
  // snapshot, and post-load notification.

  it("returns a stable empty snapshot before any load", () => {
    const first = preferenceCache.preferences;
    const second = preferenceCache.preferences;
    // Reference equality is required — `useSyncExternalStore` loops
    // infinitely if the snapshot identity changes when nothing did.
    expect(first).toBe(second);
    expect(first).toEqual([]);
  });

  it("notifies every active subscriber when a load completes", async () => {
    // Settle the cache first. The first subscriber on an unloaded cache starts
    // its own lazy load, and that load's notification would be counted too.
    await loadPreferencesContext();

    let aCount = 0;
    let bCount = 0;
    const unsubscribeA = subscribePreferences(() => {
      aCount += 1;
    });
    const unsubscribeB = subscribePreferences(() => {
      bCount += 1;
    });

    try {
      // Simulates the notify path a writer triggers after mergePreferences /
      // deletePreference / clearPreferences: the shared cache reloads and
      // every `usePreferences` subscriber re-renders with the new snapshot.
      // This is the exact mechanism that was missing — before the fix, a
      // preference saved by the AI never reached the PreferenceTrigger /
      // PreferencePanel reading via `usePreferences()`.
      await loadPreferencesContext();

      expect(aCount).toBe(1);
      expect(bCount).toBe(1);
    } finally {
      unsubscribeA();
      unsubscribeB();
    }
  });

  it("stops notifying after unsubscribe", async () => {
    let notifyCount = 0;
    const unsubscribe = subscribePreferences(() => {
      notifyCount += 1;
    });

    unsubscribe();

    const before = notifyCount;
    await loadPreferencesContext();

    expect(notifyCount).toBe(before);
  });
});
