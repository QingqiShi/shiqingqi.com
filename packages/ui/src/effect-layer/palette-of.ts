import type { LiquidControl } from "./liquid-reader.ts";
import type { EffectColor } from "./parse-css-color.ts";
import { srgbToOklab } from "./ripple-color.ts";

/** The selected surface as it shows over the track: its fill over the track's. */
function solidOf(control: LiquidControl, under: EffectColor) {
  const { color } = control;
  const a = color[3];
  return [
    under[0] + (color[0] - under[0]) * a,
    under[1] + (color[1] - under[1]) * a,
    under[2] + (color[2] - under[2]) * a,
  ] as const;
}

const palettes = new WeakMap<
  LiquidControl,
  {
    readonly under: EffectColor;
    readonly solid: readonly [number, number, number];
    readonly lightBody: boolean;
  }
>();

/**
 * The colour of a control's surface over its track, `under`, worked out
 * once for each read of the control and each fill under it.
 *
 * @internal
 */
export function paletteOf(control: LiquidControl, under: EffectColor) {
  const cached = palettes.get(control);
  if (cached?.under === under) {
    return cached;
  }
  const solid = solidOf(control, under);
  const palette = { under, solid, lightBody: srgbToOklab(solid)[0] > 0.7 };
  palettes.set(control, palette);
  return palette;
}
