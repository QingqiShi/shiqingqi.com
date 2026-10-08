import * as stylex from "@stylexjs/stylex";
import { layout, space } from "../tokens.stylex.ts";

const GUTTER_START = `calc(${space._3} + env(safe-area-inset-left))`;
const GUTTER_END = `calc(${space._3} + env(safe-area-inset-right))`;

/**
 * The page gutter: the least space between the edge of the screen and the
 * content, `space._3` past the safe area. The page column never comes closer
 * to the edge than this. Use it for a box that steps out of the page column by
 * one gutter, or for a control fixed at the edge of the screen.
 */
export const pageGutter = stylex.defineVars({
  inlineStart: GUTTER_START,
  inlineEnd: GUTTER_END,
});

/** The page column's dial, set the way `cornerTokens.height` is. */
export const pageColumnTokens = stylex.defineVars({
  /** The width of the page column, its gutters included. */
  inlineSize: layout.maxInlineSize,
});

const INSET_START = `max(${GUTTER_START}, calc((100% - ${pageColumnTokens.inlineSize}) / 2 + ${space._3}))`;
const INSET_END = `max(${GUTTER_END}, calc((100% - ${pageColumnTokens.inlineSize}) / 2 + ${space._3}))`;

// The page column is padding, not a capped box: the box spans its parent, so
// its background bleeds to the edges while its content sits in the column.
// `100%` in a padding is the inline size of the parent, so the parent must be
// as wide as the box.
export const pageColumn = stylex.create({
  /** A box that spans its parent and sets its content in the page column. */
  base: {
    paddingInlineStart: INSET_START,
    paddingInlineEnd: INSET_END,
  },
  /**
   * A horizontal scroller that spans its parent. Its first and last items
   * rest on the page column, and the items between scroll out to the edges.
   */
  scroller: {
    paddingInlineStart: INSET_START,
    paddingInlineEnd: INSET_END,
    scrollPaddingInlineStart: INSET_START,
    scrollPaddingInlineEnd: INSET_END,
  },
});
