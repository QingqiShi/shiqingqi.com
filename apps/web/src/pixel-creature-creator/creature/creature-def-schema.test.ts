import { describe, expect, it } from "vitest";
import {
  DEFAULT_CREATURE,
  creatureDefSchema,
  migrateCreatureDef,
} from "./creature-def-schema";

describe("creatureDefSchema", () => {
  it("parses the default creature", () => {
    const result = creatureDefSchema.safeParse(DEFAULT_CREATURE);
    expect(result.success).toBe(true);
  });

  it("rejects unknown extra keys via .strict()", () => {
    const extra = { ...DEFAULT_CREATURE, mystery: "extra" };
    expect(creatureDefSchema.safeParse(extra).success).toBe(false);
  });

  it("rejects unknown species ID", () => {
    const bad = { ...DEFAULT_CREATURE, species: "not-a-real-species" };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown accessory ID", () => {
    const bad = { ...DEFAULT_CREATURE, accessories: ["not-a-real-accessory"] };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });
});

describe("migrateCreatureDef", () => {
  it("returns null for garbage input", () => {
    expect(migrateCreatureDef(null)).toBeNull();
    expect(migrateCreatureDef("nope")).toBeNull();
    expect(migrateCreatureDef({})).toBeNull();
  });

  it("returns null for v:1 share-URL payloads", () => {
    const legacy = {
      v: 1,
      body: "blob-a",
      head: "round-a",
      eyeStyle: "dot",
      accessories: [],
      palette: "spring",
      type: "leaf",
      defaultEmotion: "idle",
      name: "",
    };
    expect(migrateCreatureDef(legacy)).toBeNull();
  });
});
