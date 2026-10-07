import * as stylex from "@stylexjs/stylex";
import { rhythm } from "../tokens.stylex.ts";

/** @internal `OptionCardGroup`'s grid of tiles. Its column of rows is `stack.item`. */
export const groupStyles = stylex.create({
  tile: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
    gap: rhythm.item,
  },
});
