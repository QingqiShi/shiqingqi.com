import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";

/** The calm column under the pet page's scene. The home page's footer takes its padding, so the two pages end the same way. */
export const petPageColumn = stylex.create({
  content: {
    paddingBlockStart: space._5,
    paddingBlockEnd: `calc(${space._9} + env(safe-area-inset-bottom))`,
  },
  column: {
    maxInlineSize: "64rem",
    marginInline: "auto",
  },
  narrow: {
    maxInlineSize: "30rem",
  },
});
