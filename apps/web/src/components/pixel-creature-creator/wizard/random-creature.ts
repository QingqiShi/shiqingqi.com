import { SPECIES_IDS } from "../sprite/species";
import { ACCESSORY_IDS, TYPE_IDS } from "../sprite/sprites";
import {
  type CreatureDef,
  EMOTIONS,
  type Emotion,
} from "../state/creature-schema";

/**
 * Generate a random valid `CreatureDef`. Used as the wizard's initial state
 * (when there's no edit hash) and by the "Shuffle all" button.
 *
 * The seed source is intentionally non-reproducible — every call should
 * produce a fresh combo. Tests inject a deterministic `rng` to hit edge
 * cases without flakiness.
 */

// Accessory count weights: 50% of creatures wear nothing, 30% one item,
// 20% two items. Picked by hand to keep the wizard preview varied without
// every creature looking cluttered.
const ACCESSORY_COUNT_THRESHOLDS: readonly {
  count: 0 | 1 | 2;
  pMax: number;
}[] = [
  { count: 0, pMax: 0.5 },
  { count: 1, pMax: 0.8 },
  { count: 2, pMax: 1 },
];

function pickIndex(rng: () => number, length: number): number {
  // `Math.floor(rng() * length)` is biased only when `rng()` returns
  // exactly 1 — Math.random never does, but injected RNGs in tests might,
  // so clamp defensively.
  if (length === 0) return 0;
  const raw = Math.floor(rng() * length);
  return Math.min(raw, length - 1);
}

function pickFrom<T>(rng: () => number, list: readonly T[]): T {
  // The sprite registries are non-empty by construction. If a future
  // refactor wipes a registry the lookup would return `undefined`; we
  // guard against that here so the schema layer doesn't have to.
  if (list.length === 0) {
    throw new Error("randomCreature: cannot pick from an empty list");
  }
  return list[pickIndex(rng, list.length)];
}

function pickAccessoryCount(rng: () => number): 0 | 1 | 2 {
  const r = rng();
  for (const { count, pMax } of ACCESSORY_COUNT_THRESHOLDS) {
    if (r < pMax) return count;
  }
  // Defensive fallback for pathological RNGs that return >= 1.
  return 2;
}

function pickAccessories(rng: () => number): string[] {
  const want = pickAccessoryCount(rng);
  if (want === 0) return [];

  const picked: string[] = [];
  // Copy so we can splice without mutating the registry-derived list.
  const pool = [...ACCESSORY_IDS];
  while (picked.length < want && pool.length > 0) {
    const idx = pickIndex(rng, pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

export function randomCreature(rng: () => number = Math.random): CreatureDef {
  const species = pickFrom(rng, SPECIES_IDS);
  const type = pickFrom(rng, TYPE_IDS);
  const defaultEmotion: Emotion = pickFrom(rng, EMOTIONS);
  const accessories = pickAccessories(rng);
  return {
    v: 2,
    species,
    accessories,
    type,
    defaultEmotion,
    name: "",
  };
}
