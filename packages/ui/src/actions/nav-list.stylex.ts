import * as stylex from "@stylexjs/stylex";
import { rhythm, space } from "../tokens.stylex.ts";

/**
 * `sidebarPage`: the list is in the sidebar of a `NavigationSplitView`, and the
 * sidebar is a page of the stack, not a column beside the content. The sidebar
 * is this container only there, so the query never holds anywhere else.
 *
 * @internal
 */
export const navListQueries = stylex.defineConsts({
  sidebarPage: "@container split-view-page (width >= 0px)",
});

/**
 * A nav rail has two inline edges. The fill of a row starts on the box edge,
 * and its content (an icon, or else the text) starts `rowInset` after it, on
 * the text edge. A shell that holds a `NavList` puts its chrome on the same
 * two edges.
 *
 * @internal
 */
export const navListTokens = stylex.defineVars({
  rowInset: space._1,
  /**
   * The space above a group, and above a link after a group. Each list sets
   * it.
   */
  step: rhythm.item,
});
