import { describe, expect, it } from "vitest";
import { species } from "../sprite/species";
import { accessories, types } from "../sprite/sprites";
import { buildQaSamples } from "./qa-samples";

describe("buildQaSamples", () => {
  const samples = buildQaSamples();

  it("includes every species at least once", () => {
    const speciesIds = new Set(Object.keys(species));
    const seen = new Set(samples.map((s) => s.def.species));
    for (const id of speciesIds) {
      expect(seen.has(id)).toBe(true);
    }
  });

  it("includes every accessory at least once", () => {
    const accessoryIds = new Set(Object.keys(accessories));
    const seen = new Set<string>();
    for (const sample of samples) {
      for (const id of sample.def.accessories) seen.add(id);
    }
    for (const id of accessoryIds) {
      expect(seen.has(id)).toBe(true);
    }
  });

  it("includes every type at least once", () => {
    const typeIds = new Set(Object.keys(types));
    const seen = new Set(samples.map((s) => s.def.type));
    for (const id of typeIds) {
      expect(seen.has(id)).toBe(true);
    }
  });

  it("is deterministic across calls", () => {
    const a = buildQaSamples();
    const b = buildQaSamples();
    expect(a).toEqual(b);
  });
});
