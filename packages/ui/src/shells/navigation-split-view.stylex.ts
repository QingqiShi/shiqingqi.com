import * as stylex from "@stylexjs/stylex";
import { navListTokens } from "../actions/nav-list.stylex.ts";
import { splitViewQueries } from "./navigation-split-view-layout.stylex.ts";

/**
 * The sizes of a `NavigationSplitView`. The view sets `columnInsetBlockEnd` on
 * each column: the strip at the bottom of the column that its content keeps
 * clear of, which is the floating tab bar of a `TabView` below 34rem, or else the
 * safe area. A sticky footer in a column sticks its own gap above it. It is 0
 * outside a column.
 */
export const splitViewTokens = stylex.defineVars({
  columnInsetBlockEnd: "0px",
  /**
   * The width of the sidebar where it shows beside the content. The view
   * shows the sidebar beside the content from the same view width whatever this
   * is. Outside a `TabView`, set it on the view with `css`. In a `TabView`, it
   * is `tabViewTokens.sidebarInlineSize`.
   */
  sidebarInlineSize: "17.5rem",
});

/**
 * For the `node` of a sidebar that is not a `NavList`, such as a headline, a
 * line of buttons and a plain `List`. Beside the content, a sidebar has two
 * inline edges: the fill of a row starts on the box edge, and its text starts
 * a row inset after it. `text` puts the node on the text edge there, so that
 * its text lines up with the labels of the destinations above it, and the
 * plates of a plain `List` in it reach back to the box edge. Where the sidebar
 * is a page, the node keeps the gutter of the page.
 */
export const sidebarEdge = stylex.create({
  text: {
    paddingInline: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: navListTokens.rowInset,
    },
  },
});
