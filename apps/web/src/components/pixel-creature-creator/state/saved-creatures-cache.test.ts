import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "./creature-def-schema";
import { getSavedCreaturesSnapshot } from "./get-saved-creatures-snapshot";
import { notifySavedCreaturesChanged } from "./notify-saved-creatures-changed";
import { saveCreature } from "./saved-creatures/save-creature";
import { subscribeSavedCreatures } from "./subscribe-saved-creatures";

describe("savedCreaturesCache", () => {
  beforeEach(() => {
    localStorage.clear();
    notifySavedCreaturesChanged();
  });

  it("returns the same array reference across calls until the store changes", () => {
    const a = getSavedCreaturesSnapshot();
    const b = getSavedCreaturesSnapshot();
    // Reference stability is required by useSyncExternalStore to avoid
    // infinite re-render loops (React error #185). Object.is(a, b) must
    // be true when the underlying data has not changed.
    expect(a).toBe(b);
  });

  it("returns a new reference after notifySavedCreaturesChanged is called", () => {
    const a = getSavedCreaturesSnapshot();
    saveCreature(DEFAULT_CREATURE);
    notifySavedCreaturesChanged();
    const b = getSavedCreaturesSnapshot();
    expect(a).not.toBe(b);
    expect(b).toHaveLength(1);
  });

  it("invalidates the snapshot when a cross-tab `storage` event fires", () => {
    const before = getSavedCreaturesSnapshot();
    saveCreature({ ...DEFAULT_CREATURE, name: "Sproutling" });

    let notified = false;
    const unsubscribe = subscribeSavedCreatures(() => {
      notified = true;
    });
    // Synthesize a storage event the way browsers fire it cross-tab.
    window.dispatchEvent(new StorageEvent("storage", { key: "pcc:saved:v1" }));
    unsubscribe();

    expect(notified).toBe(true);
    const after = getSavedCreaturesSnapshot();
    expect(after).not.toBe(before);
  });
});
