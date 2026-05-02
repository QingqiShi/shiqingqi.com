import type { StaticImageData } from "next/image";
import amorphousIdle from "./amorphous.png";
import amphibianIdle from "./amphibian.png";
import avianIdle from "./avian.png";
import canineIdle from "./canine.png";
import dinosaurianIdle from "./dinosaurian.png";
import draconicIdle from "./draconic.png";
import felineIdle from "./feline.png";
import humanoidIdle from "./humanoid.png";
import { SPECIES_IDS, SPECIES_META, type SpeciesLabel } from "./ids";
import insectoidIdle from "./insectoid.png";
import objectBasedIdle from "./object-based.png";
import piscineIdle from "./piscine.png";
import plantLikeIdle from "./plant-like.png";
import reptilianIdle from "./reptilian.png";
import roboticIdle from "./robotic.png";
import serpentineIdle from "./serpentine.png";
import wormLikeIdle from "./worm-like.png";

/**
 * Species registry — the 16 creature shapes that replace the old
 * body/head/eye-style axes. Each species ships its own 42×42 PNG with
 * eyes baked into the art; emotion is communicated via motion + blink rate
 * (see motion-math), not by swapping eye tiles.
 *
 * Sprites are extracted from `apps/web/design-assets/pixel-creature-creator/
 * species/sheet-color.png`. The extraction tooling lives in the variants
 * follow-up PR; manual cleanup is expected for any individual sprite.
 */

export type { SpeciesLabel } from "./ids";

export interface Species {
  id: string;
  label: SpeciesLabel;
  /** Idle pose — eyes open, neutral expression. */
  idle: StaticImageData;
}

const IDLE_IMAGES: Record<string, StaticImageData> = {
  feline: felineIdle,
  canine: canineIdle,
  avian: avianIdle,
  reptilian: reptilianIdle,
  dinosaurian: dinosaurianIdle,
  insectoid: insectoidIdle,
  "worm-like": wormLikeIdle,
  serpentine: serpentineIdle,
  piscine: piscineIdle,
  amphibian: amphibianIdle,
  "plant-like": plantLikeIdle,
  humanoid: humanoidIdle,
  "object-based": objectBasedIdle,
  robotic: roboticIdle,
  draconic: draconicIdle,
  amorphous: amorphousIdle,
};

// `Partial<Record<...>>` so lookups by an arbitrary ID surface `undefined`
// — callers must handle the missing-species case rather than render broken art.
type SpeciesRegistry = Partial<Record<string, Species>>;

export const species: SpeciesRegistry = Object.fromEntries(
  SPECIES_META.map((meta) => [
    meta.id,
    { id: meta.id, label: meta.label, idle: IDLE_IMAGES[meta.id] },
  ]),
);

export { SPECIES_IDS };
