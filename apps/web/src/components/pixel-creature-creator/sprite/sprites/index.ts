import {
  antennaAccessory,
  bowAccessory,
  glassesAccessory,
  hatAccessory,
  leafAccessory,
  scarfAccessory,
} from "./accessories";
import {
  dawnType,
  dustType,
  emberType,
  frostType,
  glowType,
  leafType,
  tideType,
  voidType,
} from "./types";

/**
 * Sprite registry — central place where the sprite component looks up
 * accessory tiles and creature types. Species art lives in `../species`.
 */

export interface PartLabel {
  en: string;
  zh: string;
}

export interface PartTile {
  id: string;
  label: PartLabel;
  tile: string[];
}

export interface CreatureType {
  id: string;
  label: PartLabel;
  accentColor: string;
  /**
   * Hue-rotate filter applied to the sprite stage for this type. Tuned by
   * visual inspection so each type tints the hand-authored species art
   * without obliterating its baked-in colors. `0deg` = no shift.
   */
  hueRotateDeg: number;
}

// Use `Partial<Record<...>>` so that lookups by an arbitrary string ID
// surface `undefined` in the type system — callers must handle the
// missing-tile case rather than silently rendering a broken sprite.
type Registry<T extends { id: string }> = Partial<Record<string, T>>;

function indexById<T extends { id: string }>(parts: T[]): Registry<T> {
  const out: Registry<T> = {};
  for (const part of parts) out[part.id] = part;
  return out;
}

export const accessories: Registry<PartTile> = indexById([
  hatAccessory,
  scarfAccessory,
  antennaAccessory,
  glassesAccessory,
  leafAccessory,
  bowAccessory,
]);

const typeWithHue = (
  base: { id: string; label: PartLabel; accentColor: string },
  hueRotateDeg: number,
): CreatureType => ({ ...base, hueRotateDeg });

export const types: Registry<CreatureType> = indexById([
  typeWithHue(leafType, 0),
  typeWithHue(emberType, -40),
  typeWithHue(tideType, 60),
  typeWithHue(dustType, -25),
  typeWithHue(glowType, -10),
  typeWithHue(frostType, 80),
  typeWithHue(dawnType, -20),
  typeWithHue(voidType, 180),
]);

export const ACCESSORY_IDS: string[] = Object.keys(accessories);
export const TYPE_IDS: string[] = Object.keys(types);

/**
 * Fixed accessory palette. Accessory tiles use only slots `a` (primary)
 * and `b` (secondary); other slots are intentionally undefined since the
 * accessory grammar doesn't reach them. The type's hue-rotate filter
 * shifts these alongside the species art so trinkets blend with the tint.
 */
export const ACCESSORY_PALETTE: string[] = (() => {
  const palette = new Array<string>(16).fill("#000000");
  palette[0xa] = "#f4c668"; // warm gold
  palette[0xb] = "#7a4a1f"; // deep umber
  return palette;
})();
