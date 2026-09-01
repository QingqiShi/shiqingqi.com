import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "../creature-def-schema";
import { PIXEL_CREATURE_CREATOR_SAVED_KEY } from "./constants";
import { listSavedCreatures } from "./list-saved-creatures";
import { saveCreature } from "./save-creature";

// Yield to the event loop long enough for Date.now() to advance by at
// least 1ms — this is what we use instead of fake timers to guarantee
// strictly-increasing `savedAt` values across consecutive saves.
async function nextMillisecond(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 2));
}

describe("listSavedCreatures", () => {
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
