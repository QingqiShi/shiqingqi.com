import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";
import { border, controlSize, font, rhythm, space } from "../tokens.stylex.ts";

/**
 * The sizes of the leading box of a `ListRow` with a `leadingSize`, for a
 * placeholder that has to take the same place, such as a skeleton row.
 */
export const listRowSizes = stylex.defineVars({
  media_sm: space._5,
  media_md: "2.25rem",
  media_lg: "2.75rem",
});

/**
 * How the parts of a `ListRow` show. A `NavigationSplitView` sets
 * `caretDisplay` to `none` for a sidebar that shows beside the content, as a
 * row then opens beside the list. The plain form of a `List` sets the
 * divider, padding and radius, and the compact density sets the type sizes.
 *
 * @internal
 */
export const listRowTokens = stylex.defineVars({
  caretDisplay: "inline-flex",
  /**
   * How far the plate of a row in a plain list reaches into the gutter. The
   * sidebar of a `NavigationSplitView` sets it to the inset of a `NavLink`
   * row, so that each fill in the sidebar starts on the same edge.
   */
  plateInset: space._2,
  divider: border.size_1,
  itemPaddingBlock: "0px",
  rowPaddingInline: space._3,
  rowRadius: "0px",
  titleSize: font.uiBody,
  detailSize: font.uiBodySmall,
  detailLineHeight: font.lineHeightBody,
});

/**
 * `columns`: the container around a `ListRow` with `columns` is wide enough
 * to hold the detail line and the extra lines in columns beside the name.
 *
 * @internal
 */
export const listRowQueries = stylex.defineConsts({
  columns: "@container (width >= 48rem)",
});

/** The height of a name line and a detail line of a `ListRow`. */
const headLines = `(${listRowTokens.titleSize} * ${font.lineHeightBody} + ${listRowTokens.detailSize} * ${listRowTokens.detailLineHeight})`;

/**
 * The pieces `List` and `ListRow` are built from, for an item that is not a
 * row the list can open, such as a loading placeholder. `item` draws the
 * divider above every item but the first; `row` sets the height and padding
 * of a row. `withMedia` makes a row as tall as a row with a name line and a
 * detail line, as a `ListRow` with a `leadingSize` is. `plain` turns a list
 * root into the plain form: no dividers, and a rounded plate on each row that
 * reaches into the gutter. `compact` gives the rows of a list root the
 * smaller type of a dense list, such as a sidebar.
 */
export const listSurface = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    margin: 0,
    padding: 0,
    listStyle: "none",
    // Set the card values again, so that a card list in a plain list does
    // not get the plain values.
    [listRowTokens.divider]: border.size_1,
    [listRowTokens.itemPaddingBlock]: "0px",
    [listRowTokens.rowPaddingInline]: space._3,
    [listRowTokens.rowRadius]: "0px",
    [listRowTokens.titleSize]: font.uiBody,
    [listRowTokens.detailSize]: font.uiBodySmall,
    [listRowTokens.detailLineHeight]: font.lineHeightBody,
  },
  // After `plainList.list`.
  plain: {
    [listRowTokens.divider]: "0px",
    [listRowTokens.itemPaddingBlock]: space._00,
    [listRowTokens.rowPaddingInline]: listRowTokens.plateInset,
    marginInline: `calc(-1 * ${listRowTokens.plateInset})`,
    [listRowTokens.rowRadius]: border.radius_3,
  },
  compact: {
    [listRowTokens.titleSize]: font.uiBodySmall,
    [listRowTokens.detailSize]: font.uiCaption,
    [listRowTokens.detailLineHeight]: font.lineHeight_3,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    display: "flex",
    alignItems: "center",
    borderBlockStartWidth: {
      default: listRowTokens.divider,
      ":first-child": 0,
    },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    paddingBlock: listRowTokens.itemPaddingBlock,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    flexGrow: 1,
    minInlineSize: 0,
    minBlockSize: space._8,
    paddingBlock: space._1,
    paddingInline: listRowTokens.rowPaddingInline,
    borderRadius: listRowTokens.rowRadius,
    cornerShape: "squircle",
  },
  withMedia: {
    minBlockSize: `calc(${space._1} * 2 + ${headLines})`,
  },
});

/**
 * The box of a `ListRow`'s leading item at each `leadingSize`.
 *
 * @internal
 */
export const listRowMedia = stylex.create({
  sm: {
    inlineSize: listRowSizes.media_sm,
    blockSize: listRowSizes.media_sm,
    fontSize: controlSize._4,
  },
  md: {
    inlineSize: listRowSizes.media_md,
    blockSize: listRowSizes.media_md,
    fontSize: controlSize._5,
  },
  lg: {
    inlineSize: listRowSizes.media_lg,
    blockSize: listRowSizes.media_lg,
    fontSize: controlSize._6,
  },
});
