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
  // The done section is in a different place in each layout, so the page
  // renders it two times and shows one. A copy with `display: none` is not in
  // the focus order or the accessibility tree. CSS `order` would move only
  // the box, and focus would then go in a different order than the eye.
  onlyWide: {
    display: { default: "none", [TWO_COLUMNS]: "contents" },
  },
  onlyNarrow: {
    display: { default: "contents", [TWO_COLUMNS]: "none" },
  },
});
