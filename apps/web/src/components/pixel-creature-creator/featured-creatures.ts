import type { CreatureDef } from "./state/creature-schema";

/**
 * Hand-curated demo creatures for the landing-page "Featured" row and the
 * static OG image. Each picks a different species so the four together
 * exercise distinct silhouettes from the 16-species library, plus a varied
 * spread of types and accessories.
 *
 * `name` is intentionally bilingual-friendly (no language-specific
 * characters) so a single string works in both English and Chinese
 * contexts. The encoded URL hash for each creature is generated on the fly
 * by the landing page so we don't need to pin a hash here.
 */
export interface FeaturedCreature {
  def: CreatureDef;
  // Display labels are picked once per creature; the page itself supplies
  // the bilingual `t()` lookup via the FEATURED_CREATURE_LABELS map below.
  labelKey: "mochi" | "ember" | "marina" | "mossling";
}

export const FEATURED_CREATURES: readonly FeaturedCreature[] = [
  {
    labelKey: "mochi",
    def: {
      v: 2,
      species: "feline",
      accessories: ["bow"],
      type: "leaf",
      defaultEmotion: "joy",
      name: "Mochi",
    },
  },
  {
    labelKey: "ember",
    def: {
      v: 2,
      species: "draconic",
      accessories: ["scarf"],
      type: "ember",
      defaultEmotion: "excited",
      name: "Ember",
    },
  },
  {
    labelKey: "marina",
    def: {
      v: 2,
      species: "piscine",
      accessories: ["glasses"],
      type: "tide",
      defaultEmotion: "curious",
      name: "Marina",
    },
  },
  {
    labelKey: "mossling",
    def: {
      v: 2,
      species: "plant-like",
      accessories: ["leaf"],
      type: "glow",
      defaultEmotion: "idle",
      name: "Mossling",
    },
  },
];
