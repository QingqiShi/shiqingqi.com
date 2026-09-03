import * as stylex from "@stylexjs/stylex";
import { space } from "../../tokens.stylex.ts";

/** @internal `OptionCardGroup`'s container layout: a column of rows, or a grid of tiles. */
export const groupStyles = stylex.create({
  row: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  tile: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
    gap: space._2,
  },
});
