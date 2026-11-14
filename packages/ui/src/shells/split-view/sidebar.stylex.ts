import * as stylex from "@stylexjs/stylex";
import { color } from "../../color.stylex.ts";
import { tabViewWidth } from "../../primitives/view-width.stylex.ts";
import { scrollMaskTokens } from "../../surfaces/scroll-mask.stylex.ts";
import { space } from "../../tokens.stylex.ts";
import { splitViewQueries } from "../navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "../navigation-split-view.stylex.ts";

const SIDEBAR_INLINE_SIZE = `calc(${splitViewTokens.sidebarInlineSize} + env(safe-area-inset-left))`;

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
  // The slot of the footer of a sidebar that stays on the screen. Beside the
  // content, the slot is fixed to the bottom of the viewport, and does not
  // stick to the bottom of the sidebar. Safari on an iPad collapses the bar
  // at its top while the page scrolls, and it changes `dvh` only after that
  // motion ends, so the bottom of the sidebar jumps then. The bottom of the
  // viewport does not move. The slot has no inline inset, so it stays at the
  // inline start of the sidebar. It is as wide as the list, which a scrollbar
  // that takes room makes narrower than the sidebar. A fixed box prints on
  // each page, so the slot sticks in print.
  footerSlot: {
    position: {
      default: "fixed",
      [splitViewQueries.noSidebarBeside]: "static",
      "@media print": "sticky",
    },
    inlineSize: {
      default: `calc(${SIDEBAR_INLINE_SIZE} - ${scrollMaskTokens.scrollbar})`,
      [splitViewQueries.noSidebarBeside]: "auto",
    },
  },
  // The fixed slot holds no room in the scroller, so the scroller pads its
  // end by the size of the slot, and the last row scrolls clear of the footer.
  scrollerAboveFooter: {
    paddingBlockEnd: {
      default: scrollMaskTokens.endChrome,
      [splitViewQueries.noSidebarBeside]: 0,
      "@media print": 0,
    },
  },
});
