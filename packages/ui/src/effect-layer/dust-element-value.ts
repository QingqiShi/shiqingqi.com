import { dustColor, packColor } from "./dust-color.ts";
import type { DustElement } from "./dust-layout.ts";
import { roleBits } from "./effect-roles.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import type { EffectElementRecord, EffectInput } from "./types.ts";

/**
 * The role bits of an element that sheds dust, and of an extractor fan.
 *
 * @internal
 */
export const DUST = roleBits(["dust"]);
/** @internal */
export const EXTRACTOR_FAN = roleBits(["extractorFan"]);
const PARTICLE_OPACITY = { light: 0.9, dark: 1 } as const;

/**
 * `dustElements[index]` for an element of `EffectFrame.elements`, in a scope
 * that draws over a dark backdrop or a light one. With `colored` false, its
 * dust has no colour.
 *
 * @internal
 */
export function dustElementValue(
  { roles, fill, settings, readings }: EffectElementRecord,
  dark: boolean,
  colored: boolean,
): EffectInput<typeof DustElement> {
  const opacity = dark ? PARTICLE_OPACITY.dark : PARTICLE_OPACITY.light;
  const source =
    settings.dust?.colorFrom === "text" ? (readings.dust ?? fill) : fill;
  return {
    color:
      (roles & DUST) === 0 || !colored
        ? 0
        : packColor([...dustColor(source, dark), opacity]),
    reach:
      (roles & EXTRACTOR_FAN) === 0
        ? 0
        : Math.max(
            0,
            finiteOr(
              settings.extractorFan?.reach,
              EFFECT_SETTING_DEFAULTS.extractorFan.reach,
            ),
          ),
    dark: dark ? 1 : 0,
  };
}

/**
 * The still motes drawn around each element that sheds dust under reduced
 * motion.
 *
 * @internal
 */
export const DUST_MOTES_PER_ELEMENT = 28;

/**
 * The vertices of each quad: two triangles of a triangle list, six vertices
 * in a row. One draw of many small quads is cheaper than as many instances.
 *
 * @internal
 */
export const DUST_QUAD_VERTICES = 6;

/** @internal */
export const DUST_WORKGROUP_SIZE = 64;
