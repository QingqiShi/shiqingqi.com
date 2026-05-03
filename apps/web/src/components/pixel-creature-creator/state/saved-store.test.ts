import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "./creature-schema";
import { saveCreature } from "./local-storage";
import {
  getSavedSnapshot,
  notifySavedStore,
  subscribeToSavedStore,
} from "./saved-store";

describe("saved-store snapshot caching", () => {
  beforeEach(() => {
    localStorage.clear();
    notifySavedStore();
  });

  it("returns the same array reference across calls until the store is notified", () => {
    const a = getSavedSnapshot();
    const b = getSavedSnapshot();
    // Reference stability is required by useSyncExternalStore to avoid
    // infinite re-render loops (React error #185). Object.is(a, b) must
    // be true when the underlying data has not changed.
    expect(a).toBe(b);
  });

  it("returns a new reference after notifySavedStore is called", () => {
    const a = getSavedSnapshot();
    saveCreature(DEFAULT_CREATURE);
    notifySavedStore();
    const b = getSavedSnapshot();
    expect(a).not.toBe(b);
    expect(b).toHaveLength(1);
  });

  it("invalidates the snapshot when a cross-tab `storage` event fires", () => {
    const before = getSavedSnapshot();
    saveCreature({ ...DEFAULT_CREATURE, name: "Sproutling" });

    let notified = false;
    const unsubscribe = subscribeToSavedStore(() => {
      notified = true;
    });
    // Synthesize a storage event the way browsers fire it cross-tab.
    window.dispatchEvent(new StorageEvent("storage", { key: "pcc:saved:v1" }));
    unsubscribe();

    expect(notified).toBe(true);
    const after = getSavedSnapshot();
    expect(after).not.toBe(before);
  });
});
