export interface PartLabel {
  en: string;
  zh: string;
}

/**
 * An Accessory as authored in `./accessories`: a 32×32 grid of art-pixels
 * using palette slots `a` (primary) and `b` (secondary), and ` ` for
 * transparent.
 */
export interface PartTile {
  id: string;
  label: PartLabel;
  tile: string[];
}

/**
 * An Element — the Creature's elemental category. Carries an `accentColor`
 * so the review-screen card can theme itself per Element without looking up
 * palettes.
 */
export interface CreatureElement {
  id: string;
  label: PartLabel;
  accentColor: string;
  /**
   * Hue-rotate filter applied to the sprite stage for this Element. Tuned by
   * visual inspection so each Element tints the hand-authored species art
   * without obliterating its baked-in colors. `0deg` = no shift.
   */
  hueRotateDeg: number;
}

/** An Element as authored in `./elements`; `elements` adds the hue-rotate. */
export type ElementBase = Omit<CreatureElement, "hueRotateDeg">;
