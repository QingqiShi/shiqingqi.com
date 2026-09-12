import * as stylex from "@stylexjs/stylex";
import { color } from "../tokens.stylex.ts";

/** The tone that drifts across the surface. */
export const washTokens = stylex.defineVars({
  tone: color.neutralSurface,
});

// A Wash is a broad gradient that gives a surface some volume: one tone
// drifting toward transparent across it. It has no bright spot anywhere — a
// bright spot reads as a light source, and only Glass is lit.
// `washTokens.tone` is the per-surface dial, set the way `cornerTokens.height`
// is: override the var in a local `stylex.create` block.
export const wash = stylex.create({
  toBottom: {
    backgroundImage: `linear-gradient(to bottom, ${washTokens.tone}, transparent)`,
  },
  toTop: {
    backgroundImage: `linear-gradient(to top, ${washTokens.tone}, transparent)`,
  },
  toRight: {
    backgroundImage: `linear-gradient(to right, ${washTokens.tone}, transparent)`,
  },
  toLeft: {
    backgroundImage: `linear-gradient(to left, ${washTokens.tone}, transparent)`,
  },
});
