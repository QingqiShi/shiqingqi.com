import * as stylex from "@stylexjs/stylex";
import { color } from "../tokens.stylex.ts";

// One mark at one size, drawn rather than loaded: a 1px line or a 1px dot,
// mixed down from the text colour so it follows the theme without a token of
// its own. Each member takes the spacing between marks, because a texture drawn
// for a full page reads as noise on a small card.
//
// Nesting is the rule this file cannot keep on its own. A textured surface
// inside another textured surface puts two patterns in line, and CSS has no way
// for a descendant to notice an ancestor already painted one — a custom
// property set to suppress the descendant would suppress the ancestor too,
// since it inherits onto itself. Container style queries would settle it; until
// then the rule lives in review.
const MARK = `color-mix(in srgb, ${color.textMain} 5%, transparent)`;

export const texture = stylex.create({
  lines: (gap: string) => ({
    backgroundImage: `repeating-linear-gradient(to bottom, ${MARK} 0 1px, transparent 1px ${gap})`,
  }),
  dots: (gap: string) => ({
    backgroundImage: `radial-gradient(circle at 1px 1px, ${MARK} 1px, transparent 0)`,
    backgroundSize: `${gap} ${gap}`,
  }),
  none: {
    backgroundImage: "none",
  },
});
