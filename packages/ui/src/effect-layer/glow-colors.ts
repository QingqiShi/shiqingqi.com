import { contrastRatio } from "../contrast/contrast-ratio.ts";
import type { EffectColor } from "./parse-css-color.ts";
import {
  isLightBackdrop,
  oklabToSrgb,
  rippleColor,
  srgbToOklab,
} from "./ripple-color.ts";

type Rgb = readonly [number, number, number];

const WHITE: Rgb = [1, 1, 1];

/**
 * The contrast the frozen thumb keeps against the track it sits on, at its
 * core and at its edge: WCAG's 3:1 for the parts of a control, with a
 * margin for the frost's grain, sheen and gloss.
 *
 * @internal
 */
export const FROST_CONTRAST = { core: 3.8, edge: 3.3 } as const;

/** How far the core goes from the glow's colour towards white. */
const CORE_HEAT = { dark: 0.75, light: 0.72 } as const;
/**
 * On a light page the halo is the glow's colour with more chroma and a
 * little less lightness, so that it reads as light through its saturation.
 */
const LIGHT_HALO = { chroma: 1.5, lightness: -0.06 } as const;
/** How far the glint's core goes from the glow's colour towards white. */
const GLINT_HEAT = 0.92;
/**
 * How far the bloom goes from the glow's colour towards white: far on a dark
 * page, and a little on a light page, where it must still differ from the
 * page to show.
 */
const BLOOM_HEAT = { dark: 0.55, light: 0.1 } as const;

/** The colours mix in sRGB, as the shader mixes them. */
const mix = (from: Rgb, to: Rgb, amount: number): Rgb => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
];

const opaque = (color: Rgb) => [...color, 1] as const;

const toChannels = ([red, green, blue]: Rgb) =>
  [red * 255, green * 255, blue * 255] as const;

/**
 * Halves the span between a value that passes and one that fails twenty
 * times, and returns the passing end.
 */
function bisect(
  passing: number,
  failing: number,
  passes: (value: number) => boolean,
) {
  for (let step = 0; step < 20; step++) {
    const middle = (passing + failing) / 2;
    if (passes(middle)) {
      passing = middle;
    } else {
      failing = middle;
    }
  }
  return passing;
}

/**
 * How opaque the frozen thumb is: `least`, or more where the track would
 * show through so much that the thumb falls below `contrast` against it. The
 * thumb's colour lies over the track's. Where even the plain thumb has less
 * contrast than that, the thumb is opaque.
 *
 * @internal
 */
export function frostOpacity(
  thumb: Rgb,
  track: Rgb,
  least: number,
  contrast: number,
) {
  const contrastAt = (opacity: number) =>
    contrastRatio(toChannels(mix(track, thumb, opacity)), toChannels(track));
  if (contrastAt(least) >= contrast) {
    return least;
  }
  if (contrastAt(1) <= contrast) {
    return 1;
  }
  return bisect(1, least, (opacity) => contrastAt(opacity) >= contrast);
}

/**
 * The colour of the glow that stays under the frozen thumb on the on fill:
 * the fill, `strength` of the way to the glow's core, or less where the
 * thumb would then fall below `contrast` against it.
 *
 * @internal
 */
export function restingGlow(
  fill: Rgb,
  core: Rgb,
  thumb: Rgb,
  strength: number,
  contrast: number,
): Rgb {
  const contrastAt = (amount: number) =>
    contrastRatio(toChannels(thumb), toChannels(mix(fill, core, amount)));
  if (contrastAt(strength) >= contrast) {
    return mix(fill, core, strength);
  }
  if (contrastAt(0) < contrast) {
    return fill;
  }
  return mix(
    fill,
    core,
    bisect(0, strength, (amount) => contrastAt(amount) >= contrast),
  );
}

/**
 * The colours of the glow under a liquid Switch over a page: the halo is
 * the on fill, moved away from the page until it shows, as a Ripple's ring
 * is, and the core is that colour heated towards white. A page cannot be
 * brighter than white, so on a light page the halo is saturated instead
 * and the core stays a little tinted.
 *
 * @internal
 */
export function glowColors(fill: EffectColor, backdrop: EffectColor) {
  const shown = rippleColor(fill, backdrop);
  const light = isLightBackdrop(backdrop);
  const [red, green, blue] = light ? saturate(shown) : shown;
  const halo: Rgb = [red, green, blue];
  return {
    core: opaque(mix(halo, WHITE, light ? CORE_HEAT.light : CORE_HEAT.dark)),
    halo: opaque(halo),
  };
}

function saturate(color: Rgb) {
  const [lightness, a, b] = srgbToOklab(color);
  return oklabToSrgb([
    lightness + LIGHT_HALO.lightness,
    a * LIGHT_HALO.chroma,
    b * LIGHT_HALO.chroma,
  ]);
}

/**
 * The colours of a ring light over a page. The core is a glint, near white.
 * The tint is the glow's colour, which a comet's tail takes a hint of. The
 * bloom round the core is that tint heated towards white, less so on a
 * light page, where white cannot show.
 *
 * @internal
 */
export function ringLightColors(fill: EffectColor, backdrop: EffectColor) {
  const [red, green, blue] = glowColors(fill, backdrop).halo;
  const tint: Rgb = [red, green, blue];
  const light = isLightBackdrop(backdrop);
  return {
    core: opaque(mix(tint, WHITE, GLINT_HEAT)),
    tint: opaque(tint),
    bloom: opaque(mix(tint, WHITE, light ? BLOOM_HEAT.light : BLOOM_HEAT.dark)),
  };
}
