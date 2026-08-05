import * as stylex from "@stylexjs/stylex";
import { color } from "../tokens.stylex.ts";

// One tone drifting across a surface, to give it some volume. Linear rather
// than radial: a radial gradient concentrates somewhere, and a bright spot
// reads as a light source.
//
// The tone is mixed from a foreground colour at a low percentage rather than
// taken from a `*Fade` token. Those fade toward the page colour, which in dark
// mode *is* the page colour — a wash built on them drifts from a tone to itself
// and comes out flat. Mixing a foreground in instead darkens a light surface
// and lightens a dark one, so one expression covers both schemes.
//
// The angle is physical, so a wash does not mirror under `direction: rtl` the
// way a logical property would.
export const wash = stylex.create({
  neutral: (angle: string) => ({
    backgroundImage: `linear-gradient(${angle}, color-mix(in srgb, ${color.textMain} 5%, transparent) 0%, transparent 70%)`,
  }),
  accent: (angle: string) => ({
    backgroundImage: `linear-gradient(${angle}, color-mix(in srgb, ${color.accent} 8%, transparent) 0%, transparent 70%)`,
  }),
  none: {
    backgroundImage: "none",
  },
});
