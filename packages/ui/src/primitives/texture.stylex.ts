import * as stylex from "@stylexjs/stylex";
import { color, space } from "../tokens.stylex.ts";

/** The gap between marks. `ink` is the mark's colour. */
export const textureTokens = stylex.defineVars({
  pitch: space._1,
  ink: color.neutralBorder,
});

/** The share of the ink a line takes, so it stays as faint as a dot. */
const LINE_INK = "50%";

// A Texture is one drawn mark at one size, repeated across a surface: a 1px
// line, or a dot of 1px or less — never both, and never two sizes of the same
// mark. The mark is drawn, never an image. `textureTokens.pitch` and `.ink`
// are the per-surface dial, set the way `cornerTokens.height` is: override
// the var in a local `stylex.create` block. Never nest one texture inside
// another — a textured surface inside a textured surface puts two patterns in
// line, and neither reads as the surface it belongs to.
export const texture = stylex.create({
  // The dot sits at the centre of the first device pixel of each cell, not at
  // the centre of the cell. A browser samples a gradient at pixel centres, so
  // a 0.5px dot centred on a pixel edge draws no pixel at all at a device
  // pixel ratio of 1.
  dot: {
    backgroundImage: `radial-gradient(circle at 0.5px 0.5px, ${textureTokens.ink} 0.5px, transparent 0.5px)`,
    backgroundSize: `${textureTokens.pitch} ${textureTokens.pitch}`,
  },
  // A line covers many times the area a dot does at the same pitch, so it
  // takes the ink at a share of its strength and a wider pitch of its own,
  // which a consumer's later override still replaces.
  line: {
    [textureTokens.pitch]: space._3,
    backgroundImage: `repeating-linear-gradient(to bottom, color-mix(in srgb, ${textureTokens.ink} ${LINE_INK}, transparent) 0 1px, transparent 1px ${textureTokens.pitch})`,
  },
});
