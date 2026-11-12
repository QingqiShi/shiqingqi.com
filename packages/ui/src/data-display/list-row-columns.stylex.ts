import * as stylex from "@stylexjs/stylex";
import { font, rhythm, space } from "../tokens.stylex.ts";
import { listRowQueries, listRowTokens } from "./list.stylex.ts";

/** The height of a name line and a detail line of a `ListRow`. */
const headLines = `(${listRowTokens.titleSize} * ${font.lineHeightBody} + ${listRowTokens.detailSize} * ${listRowTokens.detailLineHeight})`;

// A row with `columns` has seven columns in a wide container: leading, name,
// detail, extra, values, trailing and caret. Each style gives both values of
// a property, the stacked one too, because a later style with only the wide
// value would take the stacked value away.
const WIDE = listRowQueries.columns;
// The values column has a least width, because each row is a grid of its own
// and an amount of another length would move the columns before it.
const COLUMNS =
  "auto minmax(0, 5fr) minmax(0, 4fr) minmax(0, 4fr) minmax(7rem, auto) auto auto";

/**
 * The layout of a `ListRow` with `columns`.
 *
 * @internal
 */
export const listRowColumns = stylex.create({
  row: {
    gridTemplateColumns: {
      default: "auto minmax(0, 1fr) auto auto auto",
      [WIDE]: COLUMNS,
    },
  },
  // One line is shorter than the name line and the detail line that a sized
  // leading item makes room for in a stacked row.
  media: {
    minBlockSize: {
      default: `calc(${space._1} * 2 + ${headLines})`,
      [WIDE]: space._8,
    },
  },
  // The item of a row with content below is a grid of the row's columns and
  // the actions, as in `listRowBelow`.
  belowItem: {
    gridTemplateColumns: {
      default: "auto minmax(0, 1fr) auto auto auto auto",
      [WIDE]: `${COLUMNS} auto`,
    },
  },
  belowRow: {
    gridColumn: { default: "1 / 6", [WIDE]: "1 / 8" },
    gridTemplateColumns: { default: "subgrid", [WIDE]: "subgrid" },
  },
  belowActions: {
    gridColumn: { default: 6, [WIDE]: 8 },
  },
  // In a wide container the row is one line, so each part centres on it.
  side: {
    gridRow: { default: "1 / 3", [WIDE]: 1 },
  },
  title: {
    alignSelf: { default: "baseline", [WIDE]: "center" },
  },
  detail: {
    alignSelf: { default: "baseline", [WIDE]: "center" },
    gridColumn: { default: 2, [WIDE]: 3 },
    gridRow: { default: 2, [WIDE]: 1 },
    marginInlineStart: { default: 0, [WIDE]: rhythm.item },
  },
  detailUnderValue: {
    alignSelf: { default: "baseline", [WIDE]: "center" },
    gridColumn: { default: "2 / 4", [WIDE]: 3 },
    gridRow: { default: 2, [WIDE]: 1 },
    marginInlineStart: { default: 0, [WIDE]: rhythm.item },
  },
  extra: {
    gridColumn: { default: "2 / 4", [WIDE]: 4 },
    gridRow: { default: 3, [WIDE]: 1 },
    alignSelf: { default: "stretch", [WIDE]: "center" },
    marginInlineStart: { default: 0, [WIDE]: rhythm.item },
  },
  extraAsDetail: {
    alignSelf: { default: "baseline", [WIDE]: "center" },
    gridColumn: { default: "2 / 4", [WIDE]: 4 },
    gridRow: { default: 2, [WIDE]: 1 },
    marginInlineStart: { default: 0, [WIDE]: rhythm.item },
  },
  extraBesideValue: {
    alignSelf: { default: "baseline", [WIDE]: "center" },
    gridColumn: { default: 2, [WIDE]: 4 },
    gridRow: { default: 2, [WIDE]: 1 },
    marginInlineStart: { default: 0, [WIDE]: rhythm.item },
  },
  values: {
    gridColumn: { default: 3, [WIDE]: 5 },
  },
  value: {
    gridColumn: { default: 3, [WIDE]: 5 },
    gridRow: 1,
    alignSelf: { default: "baseline", [WIDE]: "center" },
    justifySelf: "end",
    marginInlineStart: rhythm.tight,
  },
  valueDetail: {
    gridColumn: { default: 3, [WIDE]: 5 },
    gridRow: 2,
    alignSelf: "baseline",
    justifySelf: "end",
    marginInlineStart: rhythm.tight,
  },
  trailing: {
    gridColumn: { default: 4, [WIDE]: 6 },
  },
  caret: {
    gridColumn: { default: 5, [WIDE]: 7 },
  },
});
