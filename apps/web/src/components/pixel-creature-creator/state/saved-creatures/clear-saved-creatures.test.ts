import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "../creature-def-schema";
import { clearSavedCreatures } from "./clear-saved-creatures";
import { listSavedCreatures } from "./list-saved-creatures";
import { saveCreature } from "./save-creature";

describe("clearSavedCreatures", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("empties the list", () => {
    saveCreature(DEFAULT_CREATURE);
    saveCreature(DEFAULT_CREATURE);
    clearSavedCreatures();
    expect(listSavedCreatures()).toEqual([]);
  });
});
