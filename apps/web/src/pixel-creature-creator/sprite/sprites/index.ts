import { antennaAccessory } from "#src/pixel-creature-creator/sprite/sprites/accessories/antenna-accessory.ts";
import { bowAccessory } from "#src/pixel-creature-creator/sprite/sprites/accessories/bow-accessory.ts";
import { glassesAccessory } from "#src/pixel-creature-creator/sprite/sprites/accessories/glasses-accessory.ts";
import { hatAccessory } from "#src/pixel-creature-creator/sprite/sprites/accessories/hat-accessory.ts";
import { leafAccessory } from "#src/pixel-creature-creator/sprite/sprites/accessories/leaf-accessory.ts";
import { scarfAccessory } from "#src/pixel-creature-creator/sprite/sprites/accessories/scarf-accessory.ts";
import { dawnElement } from "#src/pixel-creature-creator/sprite/sprites/elements/dawn-element.ts";
import { dustElement } from "#src/pixel-creature-creator/sprite/sprites/elements/dust-element.ts";
import { emberElement } from "#src/pixel-creature-creator/sprite/sprites/elements/ember-element.ts";
import { frostElement } from "#src/pixel-creature-creator/sprite/sprites/elements/frost-element.ts";
import { glowElement } from "#src/pixel-creature-creator/sprite/sprites/elements/glow-element.ts";
import { leafElement } from "#src/pixel-creature-creator/sprite/sprites/elements/leaf-element.ts";
import { tideElement } from "#src/pixel-creature-creator/sprite/sprites/elements/tide-element.ts";
import { voidElement } from "#src/pixel-creature-creator/sprite/sprites/elements/void-element.ts";
import type { CreatureElement, ElementBase, PartTile } from "./types";

/**
 * Sprite registry — central place where the sprite component looks up
 * Accessories and Elements. Species art lives in `../species`. The shapes
 * they conform to are declared once in `./types`.
 */

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

const elementWithHue = (
  base: ElementBase,
  hueRotateDeg: number,
): CreatureElement => ({ ...base, hueRotateDeg });

export const elements: Registry<CreatureElement> = indexById([
  elementWithHue(leafElement, 0),
  elementWithHue(emberElement, -40),
  elementWithHue(tideElement, 60),
  elementWithHue(dustElement, -25),
  elementWithHue(glowElement, -10),
  elementWithHue(frostElement, 80),
  elementWithHue(dawnElement, -20),
  elementWithHue(voidElement, 180),
]);

export const ACCESSORY_IDS: string[] = Object.keys(accessories);
export const ELEMENT_IDS: string[] = Object.keys(elements);

/**
 * Fixed accessory palette. Accessory tiles use only slots `a` (primary)
 * and `b` (secondary); other slots are intentionally undefined since the
 * accessory grammar doesn't reach them. The Element's hue-rotate filter
 * shifts these alongside the species art so trinkets blend with the tint.
 */
export const ACCESSORY_PALETTE: string[] = (() => {
  const palette = new Array<string>(16).fill("#000000");
  palette[0xa] = "#f4c668"; // warm gold
  palette[0xb] = "#7a4a1f"; // deep umber
  return palette;
})();
