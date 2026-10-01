import { describe, expect, it } from "vitest";
import { species } from "#src/pixel-creature-creator/sprite/species/index.ts";
import {
  accessories,
  elements,
} from "#src/pixel-creature-creator/sprite/sprites/index.ts";
import { buildQaSamples } from "./build-qa-samples";

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
    const elementIds = new Set(Object.keys(elements));
    const seen = new Set(samples.map((s) => s.def.type));
    for (const id of elementIds) {
      expect(seen.has(id)).toBe(true);
    }
  });

  it("is deterministic across calls", () => {
    const a = buildQaSamples();
    const b = buildQaSamples();
    expect(a).toEqual(b);
  });
});
