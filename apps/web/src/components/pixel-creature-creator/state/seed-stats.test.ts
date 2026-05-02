import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "./creature-schema";
import { STAT_KEYS, computeSeedStats, fnv1a, lcg } from "./seed-stats";

describe("fnv1a", () => {
  it("is deterministic", () => {
    expect(fnv1a("abc")).toBe(fnv1a("abc"));
  });

  it("differs for different inputs", () => {
    expect(fnv1a("abc")).not.toBe(fnv1a("abd"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const value = fnv1a("hello world");
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffff_ffff);
  });
});

describe("lcg", () => {
  it("is deterministic", () => {
    expect(lcg(123)).toBe(lcg(123));
  });

  it("returns an unsigned 32-bit integer", () => {
    const value = lcg(42);
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(0xffff_ffff);
  });
});

describe("computeSeedStats", () => {
  it("is deterministic across calls", () => {
    const a = computeSeedStats(DEFAULT_CREATURE);
    const b = computeSeedStats(DEFAULT_CREATURE);
    expect(a).toEqual(b);
  });

  it("matches pinned values for DEFAULT_CREATURE", () => {
    // Pinned to catch accidental algorithm changes in future PRs. If the
    // hashing/scaling intentionally changes, regenerate by running this test
    // and pasting the actual values.
    expect(computeSeedStats(DEFAULT_CREATURE)).toEqual({
      vigour: 76,
      spark: 99,
      ward: 20,
      hustle: 91,
    });
  });

  it("matches pinned values for an accessory variant", () => {
    expect(
      computeSeedStats({
        ...DEFAULT_CREATURE,
        accessories: ["bow", "scarf"],
      }),
    ).toEqual({
      vigour: 97,
      spark: 24,
      ward: 12,
      hustle: 93,
    });
  });

  it("never produces a stat above 100 across many random defs", () => {
    // Regression for the off-by-one bug where dividing by (2^24 - 1)
    // could yield exactly 1.0 and push the final stat to 101.
    const speciesIds = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const typeIds = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const accessoryPools: string[][] = [[], ["x"], ["x", "y"], ["y", "z"]];
    let count = 0;
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
          count += 1;
        }
      }
    }
    expect(count).toBe(
      speciesIds.length * typeIds.length * accessoryPools.length,
    );
  });

  it("ignores the creature's name", () => {
    const a = computeSeedStats({ ...DEFAULT_CREATURE, name: "" });
    const b = computeSeedStats({ ...DEFAULT_CREATURE, name: "Mochi" });
    const c = computeSeedStats({ ...DEFAULT_CREATURE, name: "团子" });
    expect(a).toEqual(b);
    expect(a).toEqual(c);
  });

  it("ignores the creature's defaultEmotion", () => {
    // Emotion is wear-state, not identity — toggling it in the wizard
    // should never re-roll the numbers.
    const a = computeSeedStats({ ...DEFAULT_CREATURE, defaultEmotion: "idle" });
    const b = computeSeedStats({ ...DEFAULT_CREATURE, defaultEmotion: "joy" });
    const c = computeSeedStats({
      ...DEFAULT_CREATURE,
      defaultEmotion: "grumpy",
    });
    expect(a).toEqual(b);
    expect(a).toEqual(c);
  });

  it("produces stats in [1, 100] integers", () => {
    const stats = computeSeedStats(DEFAULT_CREATURE);
    for (const key of STAT_KEYS) {
      const value = stats[key];
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("changes when the species changes (probabilistic)", () => {
    const baseline = computeSeedStats(DEFAULT_CREATURE);
    const variants = ["species-x", "species-y", "species-z"].map((species) =>
      computeSeedStats({ ...DEFAULT_CREATURE, species }),
    );
    const allEqual = variants.every(
      (v) =>
        v.vigour === baseline.vigour &&
        v.spark === baseline.spark &&
        v.ward === baseline.ward &&
        v.hustle === baseline.hustle,
    );
    expect(allEqual).toBe(false);
  });

  it("treats accessories as a set (order-independent)", () => {
    const a = computeSeedStats({
      ...DEFAULT_CREATURE,
      accessories: ["bow", "scarf"],
    });
    const b = computeSeedStats({
      ...DEFAULT_CREATURE,
      accessories: ["scarf", "bow"],
    });
    expect(a).toEqual(b);
  });
});
