import type { EffectColor } from "./parse-css-color.ts";
import { isLightBackdrop, rippleColor } from "./ripple-color.ts";

/**
 * How far the core goes from the glow's colour: towards white on a dark
 * page, towards black on a light one.
 */
const CORE_HEAT = { dark: 0.75, light: -0.3 } as const;

/**
 * The colours of a Sweep's ring light over a page: the glow is the
 * element's fill, moved away from the page until it shows, as a Ripple's
 * ring is; the core is that colour heated towards white on a dark page,
 * where a light is bright, and deepened towards black on a light one,
 * where white would read as a gap.
 *
 * @internal
 */
export function sweepColors(fill: EffectColor, backdrop: EffectColor) {
  const [red, green, blue] = rippleColor(fill, backdrop);
  const heat = isLightBackdrop(backdrop) ? CORE_HEAT.light : CORE_HEAT.dark;
  const heated = (channel: number) =>
    heat >= 0 ? channel + (1 - channel) * heat : channel * (1 + heat);
  return {
    core: [heated(red), heated(green), heated(blue), 1] as const,
    halo: [red, green, blue, 1] as const,
  };
}
