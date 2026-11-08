import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";

/** The calm column under the scene. The pet page and the home page share it, so they read as one place. */
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
