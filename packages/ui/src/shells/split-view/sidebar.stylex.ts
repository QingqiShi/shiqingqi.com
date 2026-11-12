import * as stylex from "@stylexjs/stylex";
import { tabViewWidth } from "../../primitives/view-width.stylex.ts";
import { islandTokens } from "../../surfaces/island.stylex.ts";
import { space } from "../../tokens.stylex.ts";
import { splitViewQueries } from "../navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "../navigation-split-view.stylex.ts";

// A hidden column leaves the flow but keeps its box, its width and its
// scroll, so that it shows again as it was.
/** @internal */
export const sidebarStyles = stylex.create({
  base: {
    flexShrink: 0,
  },
  full: {
    inlineSize: splitViewTokens.sidebarInlineSize,
  },
  // Beside the content, the list is the sidebar: it lies on the canvas, which
  // has the sidebar fill, in a `TabView` under the destinations of that view.
  onCanvas: {
    backgroundColor: {
      default: islandTokens.fill,
      [splitViewQueries.contentBesideSidebar]: "transparent",
    },
  },
  // In a `TabView` narrower than 72rem, the list gives way to a detail beside
  // the content, and the rail of that view holds the destinations.
  awayBesideDetail: {
    display: {
      default: "flex",
      [tabViewWidth.sidebarNarrow]: "none",
    },
  },
  // Outside a `TabView`, the list always gives way to a detail.
  awayBesideDetailAlways: {
    display: "none",
  },
  // The visitor collapsed the sidebar: the list goes where it shows beside the
  // content, and stays the first page where the view is narrower.
  awayWhileCollapsed: {
    display: {
      default: "flex",
      [splitViewQueries.contentBesideSidebar]: "none",
    },
  },
  fullContent: {
    paddingInline: space._3,
  },
  hidden: {
    position: "absolute",
    insetBlockStart: islandTokens.insetBlockStart,
    insetBlockEnd: islandTokens.insetBlockEnd,
    insetInlineStart: islandTokens.insetInlineStart,
    visibility: "hidden",
  },
  fullBesideContent: {
    position: {
      default: "absolute",
      [splitViewQueries.contentBesideSidebar]: "relative",
    },
    insetBlockStart: {
      default: islandTokens.insetBlockStart,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    insetBlockEnd: {
      default: islandTokens.insetBlockEnd,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    insetInlineStart: {
      default: islandTokens.insetInlineStart,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideSidebar]: "visible",
    },
  },
});
