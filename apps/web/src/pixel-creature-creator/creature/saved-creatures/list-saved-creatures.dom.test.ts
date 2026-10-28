import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { PIXEL_CREATURE_CREATOR_SAVED_KEY } from "./constants";
import { listSavedCreatures } from "./list-saved-creatures";
import { saveCreature } from "./save-creature";

describe("listSavedCreatures", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("save → list returns the new entry", () => {
    const saved = saveCreature(DEFAULT_CREATURE);
    const all = listSavedCreatures();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(saved.id);
    expect(all[0].def).toEqual(DEFAULT_CREATURE);
  });

  it("treats corrupt JSON as empty", () => {
    localStorage.setItem(PIXEL_CREATURE_CREATOR_SAVED_KEY, "{not json");
    expect(listSavedCreatures()).toEqual([]);
  });

  it("drops only the malformed entries from a partially-valid list", () => {
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
    expect(list.map((e) => e.id)).toEqual(["valid-2", "valid-1"]);
  });
});
