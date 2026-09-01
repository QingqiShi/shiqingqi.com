import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "../creature-def-schema";
import { deleteSavedCreature } from "./delete-saved-creature";
import { listSavedCreatures } from "./list-saved-creatures";
import { saveCreature } from "./save-creature";

describe("deleteSavedCreature", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes a single entry", () => {
    const a = saveCreature({ ...DEFAULT_CREATURE, name: "a" });
    const b = saveCreature({ ...DEFAULT_CREATURE, name: "b" });
    deleteSavedCreature(a.id);
    const list = listSavedCreatures();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });
});
