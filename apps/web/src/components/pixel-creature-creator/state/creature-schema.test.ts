import { describe, expect, it } from "vitest";
import {
  DEFAULT_CREATURE,
  EMOTIONS,
  creatureDefSchema,
  emotionSchema,
  migrateCreatureDef,
} from "./creature-schema";

describe("emotionSchema", () => {
  it("accepts every listed emotion", () => {
    for (const emotion of EMOTIONS) {
      expect(emotionSchema.safeParse(emotion).success).toBe(true);
    }
  });

  it("rejects unknown emotions", () => {
    expect(emotionSchema.safeParse("happy").success).toBe(false);
  });
});

describe("creatureDefSchema", () => {
  it("parses the default creature", () => {
    const result = creatureDefSchema.safeParse(DEFAULT_CREATURE);
    expect(result.success).toBe(true);
  });

  it("rejects invalid emotion", () => {
    const bad = { ...DEFAULT_CREATURE, defaultEmotion: "happy" };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown extra keys via .strict()", () => {
    const extra = { ...DEFAULT_CREATURE, mystery: "extra" };
    expect(creatureDefSchema.safeParse(extra).success).toBe(false);
  });

  it("rejects more than 2 accessories", () => {
    const bad = { ...DEFAULT_CREATURE, accessories: ["hat", "scarf", "bow"] };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate accessories", () => {
    const bad = { ...DEFAULT_CREATURE, accessories: ["hat", "hat"] };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown species ID", () => {
    const bad = { ...DEFAULT_CREATURE, species: "not-a-real-species" };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown accessory ID", () => {
    const bad = { ...DEFAULT_CREATURE, accessories: ["not-a-real-accessory"] };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown type ID", () => {
    const bad = { ...DEFAULT_CREATURE, type: "not-a-real-type" };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects v:1 (legacy multi-axis schema)", () => {
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
    expect(creatureDefSchema.safeParse(legacy).success).toBe(false);
  });

  it("rejects future schema versions", () => {
    const bad = { ...DEFAULT_CREATURE, v: 3 };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a 20-char name", () => {
    const ok = { ...DEFAULT_CREATURE, name: "a".repeat(20) };
    expect(creatureDefSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects a 21-char name", () => {
    const bad = { ...DEFAULT_CREATURE, name: "a".repeat(21) };
    expect(creatureDefSchema.safeParse(bad).success).toBe(false);
  });
});

describe("migrateCreatureDef", () => {
  it("returns the parsed def for valid input", () => {
    const result = migrateCreatureDef(DEFAULT_CREATURE);
    expect(result).toEqual(DEFAULT_CREATURE);
  });

  it("returns null for garbage input", () => {
    expect(migrateCreatureDef(null)).toBeNull();
    expect(migrateCreatureDef(undefined)).toBeNull();
    expect(migrateCreatureDef("nope")).toBeNull();
    expect(migrateCreatureDef(42)).toBeNull();
    expect(migrateCreatureDef({})).toBeNull();
  });

  it("returns null when fields are missing", () => {
    const partial = { v: 2, species: "feline" };
    expect(migrateCreatureDef(partial)).toBeNull();
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
