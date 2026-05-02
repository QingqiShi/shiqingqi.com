import { describe, expect, it } from "vitest";
import { creatureDefSchema } from "../state/creature-schema";
import { randomCreature } from "./random-creature";

describe("randomCreature", () => {
  it("produces schema-valid defs across 1000 iterations", () => {
    for (let i = 0; i < 1000; i += 1) {
      const def = randomCreature();
      const result = creatureDefSchema.safeParse(def);
      // Surface the failure body if Zod ever rejects so the test is
      // diagnostic, not just a `toBe(true)` shrug.
      if (!result.success) {
        throw new Error(
          `randomCreature produced invalid def at iteration ${String(i)}: ${result.error.message}`,
        );
      }
      expect(result.success).toBe(true);
    }
  });

  it("keeps accessories within [0, 2] and free of duplicates", () => {
    for (let i = 0; i < 1000; i += 1) {
      const def = randomCreature();
      expect(def.accessories.length).toBeGreaterThanOrEqual(0);
      expect(def.accessories.length).toBeLessThanOrEqual(2);
      expect(new Set(def.accessories).size).toBe(def.accessories.length);
    }
  });

  it("uses the injected RNG (deterministic when seeded)", () => {
    // Two calls with the same RNG sequence produce identical defs — proves
    // the function consumes randomness only via the injected source.
    const seq = [
      0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65,
      0.75, 0.85,
    ];
    const make = () => {
      let i = 0;
      return () => {
        const v = seq[i % seq.length];
        i += 1;
        return v;
      };
    };
    const a = randomCreature(make());
    const b = randomCreature(make());
    expect(a).toEqual(b);
  });

  it("produces variety across many calls (smoke test)", () => {
    // Unique-set check guards against a pathological regression where the
    // function always returns the same species or type. With 16 species /
    // 8 types, 200 calls should hit several distinct values.
    const seenSpecies = new Set<string>();
    const seenTypes = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const def = randomCreature();
      seenSpecies.add(def.species);
      seenTypes.add(def.type);
    }
    expect(seenSpecies.size).toBeGreaterThan(1);
    expect(seenTypes.size).toBeGreaterThan(1);
  });
});
