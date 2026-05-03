import type { CreatureDef } from "./creature-schema";

/**
 * Pure deterministic stat derivation. Same creature → same stats forever;
 * the player's chosen `name` and `defaultEmotion` are excluded from the
 * seed so renaming or swapping the vibe never re-rolls the numbers.
 */

export interface CreatureStats {
  vigour: number;
  spark: number;
  ward: number;
  hustle: number;
}

export const STAT_KEYS: readonly (keyof CreatureStats)[] = [
  "vigour",
  "spark",
  "ward",
  "hustle",
];

const FNV_OFFSET_BASIS = 0x811c_9dc5;
const FNV_PRIME = 0x0100_0193;

/**
 * 32-bit FNV-1a hash. Plain integer arithmetic with `Math.imul` to keep
 * results stable across runtimes (avoids the `>>> 0` quirks of bitwise ops
 * on large numbers).
 */
export function fnv1a(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * Tiny LCG (Numerical Recipes constants). Returns the next state; callers
 * thread it themselves so the function stays referentially transparent.
 */
export function lcg(seed: number): number {
  // (a * x + c) mod 2^32, with a = 1664525, c = 1013904223.
  return (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
}

function statSeed(baseSeed: number, statKey: string): number {
  // Mix the stat key into the seed by XORing in its hash, then advance the
  // LCG once to decorrelate adjacent stat keys.
  return lcg(baseSeed ^ fnv1a(statKey));
}

function rollStat(seed: number): number {
  // Take the high 24 bits; low LCG bits are notoriously low-quality.
  const advanced = lcg(seed);
  // Divide by 2^24 (0x0100_0000) so `unit` lives in [0, 1) — dividing by
  // (2^24 - 1) lets the maximum 24-bit value land at exactly 1.0, which
  // would push the final stat to 101.
  const unit = (advanced >>> 8) / 0x0100_0000;
  // Map [0, 1) → integer [1, 100].
  return 1 + Math.floor(unit * 100);
}

function fingerprint(def: CreatureDef): string {
  // Sort accessories so [a, b] and [b, a] hash identically.
  const accessories = [...def.accessories].sort().join(",");
  return [
    `v:${String(def.v)}`,
    `species:${def.species}`,
    `type:${def.type}`,
    `acc:${accessories}`,
  ].join("|");
}

export function computeSeedStats(def: CreatureDef): CreatureStats {
  const baseSeed = fnv1a(fingerprint(def));
  return {
    vigour: rollStat(statSeed(baseSeed, "vigour")),
    spark: rollStat(statSeed(baseSeed, "spark")),
    ward: rollStat(statSeed(baseSeed, "ward")),
    hustle: rollStat(statSeed(baseSeed, "hustle")),
  };
}
