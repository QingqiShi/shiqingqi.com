import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "./creature-def-schema";
import { decodeCreature } from "./decode-creature";
import { encodeCreature } from "./encode-creature";

describe("encodeCreature", () => {
  it("round-trips the default creature exactly", () => {
    const encoded = encodeCreature(DEFAULT_CREATURE);
    const decoded = decodeCreature(encoded);
    expect(decoded).toEqual(DEFAULT_CREATURE);
  });

  it("produces a short string for the default creature", () => {
    const encoded = encodeCreature(DEFAULT_CREATURE);
    expect(encoded.length).toBeLessThanOrEqual(80);
  });

  it("round-trips with non-empty accessories and a custom name", () => {
    const def = {
      ...DEFAULT_CREATURE,
      accessories: ["bow", "scarf"],
      name: "Mochi",
    };
    const encoded = encodeCreature(def);
    expect(decodeCreature(encoded)).toEqual(def);
  });

  it("round-trips a non-ASCII name", () => {
    const def = { ...DEFAULT_CREATURE, name: "团子" };
    expect(decodeCreature(encodeCreature(def))).toEqual(def);
  });
});
