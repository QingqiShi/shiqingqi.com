import * as stylex from "@stylexjs/stylex";

const TWO_COLUMNS = "@container (min-width: 52rem)";

/** Inside a report, which sets the container: one column, then two when the report is wide. */
export const reportColumns = stylex.create({
  base: {
    display: { default: "flex", [TWO_COLUMNS]: "grid" },
    flexDirection: "column",
    gridTemplateColumns: {
      default: null,
      [TWO_COLUMNS]: "minmax(0, 6fr) minmax(0, 5fr)",
    },
    alignItems: { default: null, [TWO_COLUMNS]: "start" },
  },
});
