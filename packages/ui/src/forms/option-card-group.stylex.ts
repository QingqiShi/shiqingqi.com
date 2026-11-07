import * as stylex from "@stylexjs/stylex";
import { rhythm } from "../tokens.stylex.ts";

/** @internal `OptionCardStack`'s column of rows and its grid of tiles. */
export const groupStyles = stylex.create({
  tile: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
    gap: rhythm.tight,
  },
  rows: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: rhythm.tight,
  },
  equalRows: {
    gridAutoRows: "1fr",
  },
});
