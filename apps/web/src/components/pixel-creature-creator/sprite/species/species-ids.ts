/**
 * Species ID + label registry without asset imports — safe to import from
 * anywhere in the codebase, including Node-only contexts (Playwright specs,
 * server-only utilities) where bundling PNG assets would error.
 *
 * The full registry with `idle: StaticImageData` lives in `./index.ts`,
 * which re-exports these IDs and labels alongside the static images.
 */

export interface SpeciesLabel {
  en: string;
  zh: string;
}

export interface SpeciesMeta {
  id: string;
  label: SpeciesLabel;
}

// Reading order matches the source sprite sheet (top-left → bottom-right)
// so the gallery displays in a familiar order.
export const SPECIES_META: readonly SpeciesMeta[] = [
  { id: "feline", label: { en: "Feline", zh: "猫科" } },
  { id: "canine", label: { en: "Canine", zh: "犬科" } },
  { id: "avian", label: { en: "Avian", zh: "鸟类" } },
  { id: "reptilian", label: { en: "Reptilian", zh: "爬虫" } },
  { id: "dinosaurian", label: { en: "Dinosaurian", zh: "恐龙" } },
  { id: "insectoid", label: { en: "Insectoid", zh: "昆虫" } },
  { id: "worm-like", label: { en: "Worm-like", zh: "蠕虫" } },
  { id: "serpentine", label: { en: "Serpentine", zh: "蛇形" } },
  { id: "piscine", label: { en: "Piscine", zh: "鱼类" } },
  { id: "amphibian", label: { en: "Amphibian", zh: "两栖" } },
  { id: "plant-like", label: { en: "Plant-like", zh: "植物" } },
  { id: "humanoid", label: { en: "Humanoid", zh: "人形" } },
  { id: "object-based", label: { en: "Object", zh: "器物" } },
  { id: "robotic", label: { en: "Robotic", zh: "机械" } },
  { id: "draconic", label: { en: "Draconic", zh: "龙形" } },
  { id: "amorphous", label: { en: "Amorphous", zh: "不定形" } },
];

/** Flat ID array, in source-sheet order. */
export const SPECIES_IDS: string[] = SPECIES_META.map((s) => s.id);
