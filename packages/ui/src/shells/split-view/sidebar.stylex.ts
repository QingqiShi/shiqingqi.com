import * as stylex from "@stylexjs/stylex";
import { color } from "../../color.stylex.ts";
import { tabViewWidth } from "../../primitives/view-width.stylex.ts";
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
      default: color.background,
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
    insetBlockStart: 0,
    insetBlockEnd: 0,
    insetInlineStart: 0,
    visibility: "hidden",
  },
  fullBesideContent: {
    position: {
      default: "absolute",
      [splitViewQueries.contentBesideSidebar]: "relative",
    },
    insetBlockStart: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    insetBlockEnd: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    insetInlineStart: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideSidebar]: "visible",
    },
  },
  // Where the page scrolls the content, the sidebar beside it stays on the
  // screen, as tall as the screen, and scrolls its own list. After the styles
  // that put the sidebar at the root of the stack.
  sticksAtRoot: {
    position: {
      default: "relative",
      [splitViewQueries.contentBesideSidebar]: "sticky",
    },
    insetBlockStart: 0,
    alignSelf: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]: "flex-start",
    },
    blockSize: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]: "100dvh",
    },
  },
  // After the styles that put the sidebar under the content.
  sticksUnder: {
    position: {
      default: "absolute",
      [splitViewQueries.contentBesideSidebar]: "sticky",
    },
    insetBlockStart: 0,
    alignSelf: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]: "flex-start",
    },
    blockSize: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]: "100dvh",
    },
  },
});
