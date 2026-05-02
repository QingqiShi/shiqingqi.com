import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "./creature-schema";
import {
  PIXEL_CREATURE_CREATOR_MAX_SAVED,
  PIXEL_CREATURE_CREATOR_SAVED_KEY,
  clearSavedCreatures,
  deleteSavedCreature,
  listSavedCreatures,
  saveCreature,
} from "./local-storage";

// Yield to the event loop long enough for Date.now() to advance by at
// least 1ms — this is what we use instead of fake timers to guarantee
// strictly-increasing `savedAt` values across consecutive saves.
async function nextMillisecond(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 2));
}

describe("local-storage saved creatures", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty list when storage is empty", () => {
    expect(listSavedCreatures()).toEqual([]);
  });

  it("save → list returns the new entry", () => {
    const saved = saveCreature(DEFAULT_CREATURE);
    const all = listSavedCreatures();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(saved.id);
    expect(all[0].def).toEqual(DEFAULT_CREATURE);
  });

  it("lists newest first", async () => {
    const first = saveCreature({ ...DEFAULT_CREATURE, name: "first" });
    await nextMillisecond();
    const second = saveCreature({ ...DEFAULT_CREATURE, name: "second" });
    const list = listSavedCreatures();
    expect(list.map((e) => e.id)).toEqual([second.id, first.id]);
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

  it("delete removes a single entry", () => {
    const a = saveCreature({ ...DEFAULT_CREATURE, name: "a" });
    const b = saveCreature({ ...DEFAULT_CREATURE, name: "b" });
    deleteSavedCreature(a.id);
    const list = listSavedCreatures();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });

  it("clear empties the list", () => {
    saveCreature(DEFAULT_CREATURE);
    saveCreature(DEFAULT_CREATURE);
    clearSavedCreatures();
    expect(listSavedCreatures()).toEqual([]);
  });

  it("treats corrupt JSON as empty", () => {
    localStorage.setItem(PIXEL_CREATURE_CREATOR_SAVED_KEY, "{not json");
    expect(listSavedCreatures()).toEqual([]);
  });

  it("treats schema-invalid entries as empty", () => {
    localStorage.setItem(
      PIXEL_CREATURE_CREATOR_SAVED_KEY,
      JSON.stringify([{ id: "x", savedAt: 1, def: { wrong: "shape" } }]),
    );
    expect(listSavedCreatures()).toEqual([]);
  });

  it("treats a non-array root as empty", () => {
    localStorage.setItem(
      PIXEL_CREATURE_CREATOR_SAVED_KEY,
      JSON.stringify({ id: "x" }),
    );
    expect(listSavedCreatures()).toEqual([]);
  });

  it("drops only the malformed entries from a partially-valid list", () => {
    // Three entries: first and last are well-formed, middle is missing
    // `def`. Per-entry parsing should keep the two valid ones.
    const valid1 = {
      id: "valid-1",
      savedAt: 100,
      def: { ...DEFAULT_CREATURE, name: "alpha" },
    };
    const valid2 = {
      id: "valid-2",
      savedAt: 300,
      def: { ...DEFAULT_CREATURE, name: "gamma" },
    };
    const malformed = { id: "malformed", savedAt: 200 };
    localStorage.setItem(
      PIXEL_CREATURE_CREATOR_SAVED_KEY,
      JSON.stringify([valid1, malformed, valid2]),
    );
    const list = listSavedCreatures();
    expect(list).toHaveLength(2);
    // Sorted newest first: valid2 (savedAt 300) then valid1 (savedAt 100).
    expect(list.map((e) => e.id)).toEqual(["valid-2", "valid-1"]);
  });
});
