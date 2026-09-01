import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "../creature-def-schema";
import { PIXEL_CREATURE_CREATOR_MAX_SAVED } from "./constants";
import { listSavedCreatures } from "./list-saved-creatures";
import { saveCreature } from "./save-creature";

// Yield to the event loop long enough for Date.now() to advance by at
// least 1ms — this is what we use instead of fake timers to guarantee
// strictly-increasing `savedAt` values across consecutive saves.
async function nextMillisecond(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 2));
}

describe("saveCreature", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("caps at the max and evicts the oldest", async () => {
    const saved: { id: string; name: string }[] = [];
    for (let i = 0; i < PIXEL_CREATURE_CREATOR_MAX_SAVED + 3; i += 1) {
      const entry = saveCreature({
        ...DEFAULT_CREATURE,
        name: `c${String(i)}`,
      });
      saved.push({ id: entry.id, name: `c${String(i)}` });
      // Real-time delay between saves to keep `savedAt` strictly increasing.
      await nextMillisecond();
    }
    const list = listSavedCreatures();
    expect(list).toHaveLength(PIXEL_CREATURE_CREATOR_MAX_SAVED);
    // The 3 oldest should be evicted; newest 10 remain.
    const expectedNames = saved
      .slice(-PIXEL_CREATURE_CREATOR_MAX_SAVED)
      .map((s) => s.name)
      .reverse();
    expect(list.map((e) => e.def.name)).toEqual(expectedNames);
  });
});
