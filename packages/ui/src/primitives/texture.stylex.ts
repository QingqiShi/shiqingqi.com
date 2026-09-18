import * as stylex from "@stylexjs/stylex";
import { color, space } from "../tokens.stylex.ts";

/** The share of the foreground the default ink takes, so a mark stays faint. */
const DEFAULT_INK = "20%";

/** The gap between marks. `ink` is the mark's colour. */
export const textureTokens = stylex.defineVars({
  pitch: space._1,
  ink: `color-mix(in srgb, ${color.fg} ${DEFAULT_INK}, transparent)`,
});

// A Texture is one drawn dot of 1px or less, repeated across a surface at one
// size — never two sizes in one group. The dot is drawn, never an image.
// `textureTokens.pitch` and `.ink` are the per-surface dial, set the way
// `cornerTokens.height` is: override the var in a local `stylex.create` block.
// Never nest one texture inside another — a textured surface inside a textured
// surface puts two patterns in line, and neither reads as the surface it
// belongs to.
export const texture = stylex.create({
  // The dot sits at the centre of the first device pixel of each cell, where
  // a browser samples a gradient; on a pixel edge a 0.5px dot softens across
  // four pixels at a device pixel ratio of 1. The grid starts half a pitch in,
  // to keep the first row and column off the edge. Half a pitch must be a
  // whole pixel to hold that centre, as `space._0` and up are at a 16px root.
  dot: {
    backgroundImage: `radial-gradient(circle at 0.5px 0.5px, ${textureTokens.ink} 0.5px, transparent 0.5px)`,
    backgroundSize: `${textureTokens.pitch} ${textureTokens.pitch}`,
    backgroundPosition: `calc(${textureTokens.pitch} / 2) calc(${textureTokens.pitch} / 2)`,
  },
});
