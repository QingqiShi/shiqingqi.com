import * as stylex from "@stylexjs/stylex";
import { color } from "../tokens.stylex.ts";

/**
 * A surface's finish: its Wash, its Texture, or both.
 *
 * The two are one primitive because they are one CSS property. A wash and a
 * texture are both background layers, and `background-image` takes a list — so
 * as two style objects they do not compose, they overwrite, and the surface
 * silently keeps whichever was applied last. Composing the list here is the only
 * way a surface can carry both.
 *
 * Every tone is mixed from a foreground colour rather than taken from a `*Fade`
 * token. Those fade toward the page colour, which in dark mode *is* the page
 * colour — a wash built on them drifts from a tone to itself and comes out flat.
 * Mixing a foreground in instead darkens a light surface and lightens a dark
 * one, so one expression covers both schemes.
 *
 * Angles and gaps are per surface: a texture drawn for a full page reads as
 * noise on a small card, and a gradient that gives a page volume is a smear
 * across a chip. Angles are physical, so a wash does not mirror under
 * `direction: rtl` the way a logical property would.
 *
 * A wash cannot be held back until the pointer arrives, the way the language
 * lets a component hold colour back. `background-image` is not an animatable
 * property, so swapping one gradient for another on `:hover` snaps — which reads
 * worse than not moving at all. A held-back wash needs its own layer to fade the
 * opacity of, and that is a component's decision rather than a primitive's.
 *
 * Nesting is the rule this file cannot keep on its own. A textured surface
 * inside another textured surface puts two patterns in line, and CSS has no way
 * for a descendant to notice an ancestor already painted one — a custom property
 * set to suppress the descendant would suppress the ancestor too, since it
 * inherits onto itself. Container style queries would settle it; until then the
 * rule lives in review.
 */

// One mark at one size, drawn rather than loaded. The dot carries further than
// the line at the same alpha, so it is mixed a shade weaker.
const LINE = `color-mix(in srgb, ${color.textMain} 5%, transparent)`;
const DOT = `color-mix(in srgb, ${color.textMain} 4%, transparent)`;

// A wash reaches 70% of the way across and stops, so the far side of a surface
// is the surface itself rather than a second tone. Past that it reads as two
// colours meeting instead of one drifting.
//
// Strength is an argument, not a constant. A wash that gives a card volume is a
// stain on a full page, because the page is bigger and the eye reads a gradient
// by how far it travels rather than by how strong it is at one point. An accent
// wash needs a lower ceiling still: past about 5% the hue stops being the tone
// of the ground and starts being a colour the page is using for something.
export const surface = stylex.create({
  plain: {
    backgroundImage: "none",
  },

  lines: (gap: string) => ({
    backgroundImage: `repeating-linear-gradient(to bottom, ${LINE} 0 1px, transparent 1px ${gap})`,
  }),
  dots: (gap: string) => ({
    backgroundImage: `radial-gradient(circle at 1px 1px, ${DOT} 1px, transparent 0)`,
    backgroundSize: `${gap} ${gap}`,
  }),

  wash: (angle: string, strength: string) => ({
    backgroundImage: `linear-gradient(${angle}, color-mix(in srgb, ${color.textMain} ${strength}, transparent) 0%, transparent 70%)`,
  }),
  accentWash: (angle: string, strength: string) => ({
    backgroundImage: `linear-gradient(${angle}, color-mix(in srgb, ${color.accent} ${strength}, transparent) 0%, transparent 70%)`,
  }),

  // The wash is listed first so it paints over the texture: the mark belongs to
  // the surface, and a gradient drifting across it should carry the mark with
  // it rather than sit behind it.
  washedLines: (angle: string, strength: string, gap: string) => ({
    backgroundImage: `linear-gradient(${angle}, color-mix(in srgb, ${color.textMain} ${strength}, transparent) 0%, transparent 70%), repeating-linear-gradient(to bottom, ${LINE} 0 1px, transparent 1px ${gap})`,
  }),
  washedDots: (angle: string, strength: string, gap: string) => ({
    backgroundImage: `linear-gradient(${angle}, color-mix(in srgb, ${color.textMain} ${strength}, transparent) 0%, transparent 70%), radial-gradient(circle at 1px 1px, ${DOT} 1px, transparent 0)`,
    backgroundSize: `auto, ${gap} ${gap}`,
  }),
  accentWashedDots: (angle: string, strength: string, gap: string) => ({
    backgroundImage: `linear-gradient(${angle}, color-mix(in srgb, ${color.accent} ${strength}, transparent) 0%, transparent 70%), radial-gradient(circle at 1px 1px, ${DOT} 1px, transparent 0)`,
    backgroundSize: `auto, ${gap} ${gap}`,
  }),
});
