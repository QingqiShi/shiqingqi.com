import { SPECIES_IDS } from "../sprite/species";
import { ACCESSORY_IDS, TYPE_IDS } from "../sprite/sprites";
import { type CreatureDef } from "./creature-schema";

/**
 * Combinatorial QA grid — coverage-oriented sampling so every species,
 * type, and accessory appears at least once across the grid before any
 * value repeats. The seed makes the order deterministic.
 *
 * The wizard uses this list to eyeball each new asset at least once. Pure
 * random sampling could leave parts entirely unused at small N, which is
 * why we cycle through each axis instead.
 */
export interface QaSample {
  def: CreatureDef;
}

export const COMBINATORIAL_QA_COUNT = 20;
const COMBINATORIAL_SEED = 1337;

/**
 * Mulberry32 PRNG — small, deterministic, good enough for picking
 * gallery samples without pulling in a dependency.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher–Yates shuffle of `items` using the provided PRNG. Pure over
 * (rng, items): reseeding `rng` produces the same order every time.
 */
function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function buildQaSamples(): QaSample[] {
  const rng = mulberry32(COMBINATORIAL_SEED);
  const speciesOrder = shuffle(rng, SPECIES_IDS);
  const typeOrder = shuffle(rng, TYPE_IDS);
  const accessoryOrder = shuffle(rng, ACCESSORY_IDS);

  const samples: QaSample[] = [];
  for (let i = 0; i < COMBINATORIAL_QA_COUNT; i += 1) {
    const species = speciesOrder[i % speciesOrder.length];
    const typeId = typeOrder[i % typeOrder.length];

    // Distribute accessories across samples so every accessory appears at
    // least once. Two-accessory samples land every fourth slot to exercise
    // the dual-accessory render path without dominating the grid.
    const accessoriesForSample: string[] = [];
    if (accessoryOrder.length > 0) {
      const primary = accessoryOrder[i % accessoryOrder.length];
      accessoriesForSample.push(primary);
      if (i % 4 === 3 && accessoryOrder.length > 1) {
        const secondaryIdx = (i + 1) % accessoryOrder.length;
        const secondary = accessoryOrder[secondaryIdx];
        if (secondary !== primary) {
          accessoriesForSample.push(secondary);
        }
      }
    }

    const def: CreatureDef = {
      v: 2,
      species,
      accessories: accessoriesForSample,
      type: typeId,
      defaultEmotion: "idle",
      name: "",
    };

    samples.push({ def });
  }
  return samples;
}
