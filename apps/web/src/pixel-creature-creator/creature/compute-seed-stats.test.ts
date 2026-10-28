import { describe, expect, it } from "vitest";
import { STAT_KEYS, computeSeedStats } from "./compute-seed-stats";
import { DEFAULT_CREATURE } from "./creature-def-schema";

describe("computeSeedStats", () => {
  it("never produces a stat above 100 across many random defs", () => {
    // Regression for the off-by-one bug where dividing by (2^24 - 1)
    // could yield exactly 1.0 and push the final stat to 101.
    const speciesIds = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const typeIds = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const accessoryPools: string[][] = [[], ["x"], ["x", "y"], ["y", "z"]];
    for (const species of speciesIds) {
      for (const typeId of typeIds) {
        for (const accessories of accessoryPools) {
          const stats = computeSeedStats({
            ...DEFAULT_CREATURE,
            species,
            type: typeId,
            accessories,
          });
          for (const key of STAT_KEYS) {
            expect(stats[key]).toBeGreaterThanOrEqual(1);
            expect(stats[key]).toBeLessThanOrEqual(100);
          }
        }
      }
    }
  });

  it("ignores the creature's name and defaultEmotion", () => {
    // Emotion is wear-state, not identity — toggling it in the wizard
    // should never re-roll the numbers.
    const a = computeSeedStats({
      ...DEFAULT_CREATURE,
      name: "",
      defaultEmotion: "idle",
    });
    const b = computeSeedStats({
      ...DEFAULT_CREATURE,
      name: "Mochi",
      defaultEmotion: "joy",
    });
    expect(a).toEqual(b);
  });
});
