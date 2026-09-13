import { Hct } from "../../../apps/web/src/vendor/material-color-utilities/hct.ts";
import { argbFromHex } from "../../../apps/web/src/vendor/material-color-utilities/string_utils.ts";
import { SYSTEM_PALETTE_TONES } from "./constants.ts";
import { evaluateCurve } from "./evaluate-curve.ts";
import { hellwigLightness } from "./hellwig-lightness.ts";
import { hexAt, solveTone } from "./solve-tone.ts";
import { RAMP_CURVE, type SystemHueDefinition } from "./system-hues.ts";

/** The achromatic ramp: at each tone step, the curved L* and the Hellwig lightness of gray there. */
const targets = SYSTEM_PALETTE_TONES.map((tone) => {
  const lstar = Math.max(
    0,
    Math.min(100, tone + evaluateCurve(tone, RAMP_CURVE)),
  );
  return { lstar, lightness: hellwigLightness(hexAt(0, 0, lstar)) };
});

/**
 * A hue's ramp: the hex at every tone step, each solved so its Hellwig
 * lightness equals the achromatic ramp's at that step. Every hue then reads as
 * equally bright at the same tone.
 */
export function resolveHue(
  hue: SystemHueDefinition,
): ReadonlyMap<number, string> {
  const source = Hct.fromInt(argbFromHex(hue.source));
  const tones = new Map<number, string>();
  SYSTEM_PALETTE_TONES.forEach((tone, index) => {
    const { lstar, lightness } = targets[index];
    // Black and white are pinned: near white the Helmholtz-Kohlrausch term of a
    // tinted colour exceeds white's own, so a solve there stops short of white.
    const solved =
      lstar <= 0 || lstar >= 100
        ? lstar
        : solveTone(source.hue, source.chroma, hellwigLightness, lightness);
    tones.set(tone, hexAt(source.hue, source.chroma, solved));
  });
  return tones;
}
