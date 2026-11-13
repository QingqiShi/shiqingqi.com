import * as stylex from "@stylexjs/stylex";
import { navListTokens } from "../../actions/nav-list.stylex.ts";
import { color } from "../../color.stylex.ts";
import { listRowTokens } from "../../data-display/list.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  motionKeyframes,
} from "../../primitives/motion.stylex.ts";
import {
  pageColumnTokens,
  pageGutter,
} from "../../primitives/page-column.stylex.ts";
import { stateFillTokens } from "../../primitives/selected.stylex.ts";
import { islandTokens } from "../../surfaces/island.stylex.ts";
import {
  controlHeight,
  layer,
  rhythm,
  shadow,
  space,
} from "../../tokens.stylex.ts";
import { splitViewQueries } from "../navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "../navigation-split-view.stylex.ts";
import { sidebarEdge, tabViewTokens } from "../tab-view.stylex.ts";

const CONTENT_GUTTER_START = `max(${space._4}, env(safe-area-inset-left))`;
const CONTENT_GUTTER_END = `max(${space._4}, env(safe-area-inset-right))`;
const PAGE_COLUMN_MARGIN = `calc((100% - ${pageColumnTokens.inlineSize}) / 2 + ${space._4})`;
/** The view keeps the islands clear of the status bar, except where the content fills it. */
const CONTENT_PADDING_BLOCK_START = `calc(${space._4} + max(0px, env(safe-area-inset-top) - ${islandTokens.insetBlockStart}))`;
const CONTENT_PADDING_BLOCK_END = `calc(${space._6} + ${splitViewTokens.columnInsetBlockEnd})`;
/** Above the tab bar below 34rem, and above the safe area from 34rem up. */
const ACCESSORY_INSET_BLOCK_END = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

const SIDEBAR_INLINE_SIZE = `calc(${splitViewTokens.sidebarInlineSize} + env(safe-area-inset-left))`;

/** @internal */
export const columnStyles = stylex.create({
  column: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  // The pages of a column lie on top of each other, and a motion moves
  // them inside the column.
  pages: {
    position: "relative",
    flexGrow: 1,
    minBlockSize: 0,
    overflow: "clip",
  },
  page: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    isolation: "isolate",
  },
  // A page under the one that shows, or one that leaves, keeps its scroll
  // and shows only while a motion moves it.
  pageAside: {
    position: "absolute",
    visibility: "hidden",
    contentVisibility: "hidden",
  },
  dim: {
    position: "absolute",
    inset: 0,
    zIndex: layer.overlay,
    backgroundColor: color.overlay,
    opacity: 0,
    pointerEvents: "none",
  },
  // The shadow at the inline-start edge of a page or a column while it
  // moves in over the one under it.
  edge: {
    position: "absolute",
    inset: 0,
    zIndex: layer.overlay,
    boxShadow: shadow._5,
    clipPath: "inset(-100% 0 -100% -100%)",
    opacity: 0,
    pointerEvents: "none",
  },
  // The root and the scroller of a column with chrome over its content.
  maskRoot: {
    flexGrow: 1,
    gridTemplateRows: "minmax(0, 1fr)",
    minBlockSize: 0,
  },
  maskScroller: {
    overscrollBehavior: "contain",
  },
  scroller: {
    flexGrow: 1,
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minBlockSize: "100%",
    paddingBlockStart: CONTENT_PADDING_BLOCK_START,
    paddingBlockEnd: CONTENT_PADDING_BLOCK_END,
  },
  node: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minBlockSize: 0,
  },
  // A node can mount while it is hidden, and it must lay out, as a component can
  // measure itself once as it mounts.
  nodeHidden: {
    flexGrow: 0,
    blockSize: 0,
    overflow: "clip",
    visibility: "hidden",
  },
  reveal: {
    animationName: {
      default: motionKeyframes.fadeIn,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
  },
  back: {
    display: "flex",
    marginBlockEnd: rhythm.tight,
  },
  // The way back at the start and the toolbar at the end, on one line. The
  // line stays over content that covers the screen, such as a canvas.
  topLine: {
    position: "relative",
    zIndex: layer.raised,
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
  },
  // Over content that fills the column from edge to edge, the line floats
  // at the top with the gutters of a page.
  topFloats: {
    position: "absolute",
    insetBlockStart: CONTENT_PADDING_BLOCK_START,
    insetInlineStart: CONTENT_GUTTER_START,
    insetInlineEnd: CONTENT_GUTTER_END,
    pointerEvents: "none",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.tight,
    marginInlineStart: "auto",
    marginBlockEnd: rhythm.tight,
    pointerEvents: "auto",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
    color: color.mutedForeground,
    textDecoration: "none",
    pointerEvents: "auto",
  },
  backLinkFloats: {
    minBlockSize: controlHeight.md,
    paddingInlineStart: space._2,
    paddingInlineEnd: space._3,
    color: color.foreground,
    backgroundColor: islandTokens.fill,
    boxShadow: shadow._2,
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    paddingBlockStart: CONTENT_PADDING_BLOCK_START,
    paddingInlineStart: CONTENT_GUTTER_START,
    paddingInlineEnd: `max(${space._2}, env(safe-area-inset-right))`,
  },
  // The close button overhangs the line of the breadcrumb, so that the
  // breadcrumb sits on the line of the content's back link, and the detail's
  // first line on the line of the content's title.
  close: {
    marginBlock: `calc((1lh - ${controlHeight.sm}) / 2)`,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    minInlineSize: 0,
    margin: 0,
    color: color.mutedForeground,
  },
  breadcrumbCurrent: {
    flexShrink: 0,
  },
  // The accessory sticks to the bottom of the scroller, or of the screen
  // where the page scrolls. At the end of the content, its place in the flow
  // is the room the column keeps for it, and the negative margin puts that
  // place where the accessory sticks.
  accessory: {
    position: "sticky",
    insetBlockEnd: ACCESSORY_INSET_BLOCK_END,
    zIndex: layer.raised,
    display: "flex",
    justifyContent: "flex-end",
    marginBlockStart: "auto",
    marginBlockEnd: `calc(${ACCESSORY_INSET_BLOCK_END} - ${CONTENT_PADDING_BLOCK_END})`,
    paddingBlockStart: rhythm.item,
    pointerEvents: "none",
  },
  accessoryControl: {
    pointerEvents: "auto",
  },
});

// Where the view fills a screen narrower than 30rem, the page scrolls the
// content, and it does so also on paper, which has no scroller to show the rest.
// A view in a box that does not fill the screen always scrolls its columns, as
// the page does not scroll them, though a view around it can scroll with the page.
/** @internal */
export const columnPageScrollStyles = stylex.create({
  // The page that shows is in the flow.
  page: {
    position: {
      default: "absolute",
      [splitViewQueries.pageScrolls]: "relative",
      "@media print": "relative",
    },
  },
  // A page beside it is as tall as its content, and `createPageScroll` moves it
  // to show its scroll.
  pageAside: {
    position: "absolute",
    insetBlockEnd: { default: null, [splitViewQueries.pageScrolls]: "auto" },
  },
  scroller: {
    overflowY: {
      default: "auto",
      [splitViewQueries.pageScrolls]: "visible",
      "@media print": "visible",
    },
  },
  content: {
    minBlockSize: {
      default: "100%",
      [splitViewQueries.pageScrolls]: "100dvh",
      "@media print": "auto",
    },
  },
  // Chrome sticks only to a scroller of the column, not to the page.
  chrome: {
    position: {
      default: "sticky",
      [splitViewQueries.pageScrolls]: "static",
      "@media print": "static",
    },
  },
});

/** @internal */
export const contentStyles = stylex.create({
  base: {
    position: "relative",
    flexGrow: 1,
    flexBasis: 0,
    inlineSize: "100%",
  },
  gutters: {
    paddingInlineStart: {
      default: CONTENT_GUTTER_START,
      [splitViewQueries.contentAlone]: pageGutter.inlineStart,
    },
    paddingInlineEnd: {
      default: CONTENT_GUTTER_END,
      [splitViewQueries.contentAlone]: pageGutter.inlineEnd,
    },
  },
  inPageColumn: {
    paddingInlineStart: {
      default: `max(${CONTENT_GUTTER_START}, ${PAGE_COLUMN_MARGIN})`,
      [splitViewQueries.contentAlone]: pageGutter.inlineStart,
    },
    paddingInlineEnd: {
      default: `max(${CONTENT_GUTTER_END}, ${PAGE_COLUMN_MARGIN})`,
      [splitViewQueries.contentAlone]: pageGutter.inlineEnd,
    },
  },
  // The node fills the column from edge to edge, and it keeps only the room of
  // the tab bar or the safe area under it.
  flush: {
    paddingBlockStart: 0,
    paddingBlockEnd: splitViewTokens.columnInsetBlockEnd,
    paddingInline: 0,
  },
  // A swipe from the inline-start edge goes back, so the browser takes only
  // the scroll and the zoom of a touch.
  swipes: {
    touchAction: {
      default: null,
      [splitViewQueries.contentAlone]: "pan-y pinch-zoom",
    },
  },
});

// A sidebar that is a page of the stack: below the width where it fits beside
// the content, it fills the frame, and the content shows over it. The screens
// of a motion move inside the content column, so the column has no fill of its
// own there, and each page has it.
/** @internal */
export const stackStyles = stylex.create({
  // A row of a page has no current look, and it opens in place of the page. The
  // sidebar is the container of the look of a `NavList` only while it is a page.
  sidebar: {
    [stateFillTokens.selected]: {
      default: null,
      [splitViewQueries.noSidebarBeside]: "transparent",
    },
    [listRowTokens.caretDisplay]: {
      default: null,
      [splitViewQueries.contentBesideSidebar]: "none",
    },
    [listRowTokens.plateInset]: {
      default: null,
      [splitViewQueries.contentBesideSidebar]: navListTokens.rowInset,
    },
    containerName: {
      default: "split-view-page",
      [splitViewQueries.contentBesideSidebar]: "none",
    },
    containerType: {
      default: "inline-size",
      [splitViewQueries.contentBesideSidebar]: "normal",
    }, // Beside the content, the sidebar is no island: it reaches the edges of
    // the view, as the rail of a `TabView` does.
    marginBlockStart: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: `calc(-1 * ${islandTokens.insetBlockStart})`,
    },
    marginBlockEnd: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: `calc(-1 * ${islandTokens.insetBlockEnd})`,
    },
    marginInlineStart: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: `calc(-1 * ${islandTokens.insetInlineStart})`,
    },
  },
  sidebarRoot: {
    position: "relative",
    insetBlockStart: "auto",
    insetBlockEnd: "auto",
    insetInlineStart: "auto",
    inlineSize: {
      default: "100%",
      [splitViewQueries.contentBesideSidebar]: SIDEBAR_INLINE_SIZE,
    },
    visibility: "visible",
  },
  // After `sidebarStyles.fullBesideContent`.
  sidebarUnder: {
    insetInlineEnd: {
      default: islandTokens.insetInlineEnd,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    inlineSize: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]: SIDEBAR_INLINE_SIZE,
    },
  },
  // What the sidebar draws above its list, such as the destinations of a
  // `TabView`. It stays while the list scrolls under it, and its paddings are
  // those of the rail of a `TabView`, so that the destinations keep their
  // place from one screen to the next.
  sidebarHeader: {
    display: {
      default: "none",
      [splitViewQueries.contentBesideSidebar]: "flex",
    },
    flexDirection: "column",
    flexShrink: 0,
    paddingBlockStart: sidebarEdge.paddingBlockStart,
    paddingInlineStart: `calc(${space._2} + env(safe-area-inset-left))`,
    paddingInlineEnd: space._2,
  },
  // The sidebar's own `header` shows above the list where the list is a page
  // too, with the paddings of a page. After `sidebarHeader`.
  sidebarHeaderOnPage: {
    display: "flex",
    paddingBlockStart: {
      default: CONTENT_PADDING_BLOCK_START,
      [splitViewQueries.contentBesideSidebar]: `calc(${space._2} + env(safe-area-inset-top))`,
    },
    paddingInlineStart: {
      default: CONTENT_GUTTER_START,
      [splitViewQueries.contentAlone]: pageGutter.inlineStart,
      [splitViewQueries.contentBesideSidebar]: `calc(${space._2} + env(safe-area-inset-left))`,
    },
    paddingInlineEnd: {
      default: CONTENT_GUTTER_END,
      [splitViewQueries.contentAlone]: pageGutter.inlineEnd,
      [splitViewQueries.contentBesideSidebar]: space._2,
    },
  },
  // After `sidebarContent`.
  sidebarContentUnderHeader: {
    paddingBlockStart: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: space._2,
    },
  },
  sidebarContent: {
    paddingBlockStart: {
      default: CONTENT_PADDING_BLOCK_START,
      [splitViewQueries.contentBesideSidebar]: space._2,
    },
    paddingBlockEnd: {
      default: CONTENT_PADDING_BLOCK_END,
      [splitViewQueries.contentBesideSidebar]: space._2,
    },
    paddingInlineStart: {
      default: CONTENT_GUTTER_START,
      [splitViewQueries.contentAlone]: pageGutter.inlineStart,
      [splitViewQueries.contentBesideSidebar]: `calc(${space._2} + env(safe-area-inset-left))`,
    },
    paddingInlineEnd: {
      default: CONTENT_GUTTER_END,
      [splitViewQueries.contentAlone]: pageGutter.inlineEnd,
      [splitViewQueries.contentBesideSidebar]: space._2,
    },
  },
  // The `footer` of the sidebar stays over the end of the list, which scrolls
  // under it.
  sidebarFooter: {
    display: {
      default: "none",
      [splitViewQueries.contentBesideSidebar]: "flex",
    },
    flexDirection: "column",
    flexShrink: 0,
    paddingBlockEnd: sidebarEdge.paddingBlockEnd,
    paddingInlineStart: `calc(${space._2} + env(safe-area-inset-left))`,
    paddingInlineEnd: space._2,
  },
  // Outside a `TabView`, no rail gives the footer its line, so the footer is
  // as far from the bottom as from the side. Over a home indicator, its bottom
  // is on the line of the bottom of the islands, which clears a rounded display
  // corner. After `sidebarFooter`.
  sidebarFooterOwn: {
    paddingBlockEnd: `max(${space._2}, env(safe-area-inset-bottom))`,
  },
  contentColumn: {
    backgroundColor: {
      default: "transparent",
      [splitViewQueries.contentBesideSidebar]: islandTokens.fill,
    },
  },
  contentPage: {
    backgroundColor: {
      default: islandTokens.fill,
      [splitViewQueries.contentBesideSidebar]: null,
    },
  },
  // After `sidebarStyles.fullBesideContent`.
  contentAtRoot: {
    insetInlineEnd: {
      default: islandTokens.insetInlineEnd,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    inlineSize: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]: "100%",
    },
  },
  nodeHiddenWhileStacked: {
    flexGrow: { default: 0, [splitViewQueries.contentBesideSidebar]: 1 },
    blockSize: { default: 0, [splitViewQueries.contentBesideSidebar]: "auto" },
    overflow: {
      default: "clip",
      [splitViewQueries.contentBesideSidebar]: "visible",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideSidebar]: "visible",
    },
  },
  swipes: {
    touchAction: {
      default: "pan-y pinch-zoom",
      [splitViewQueries.contentBesideSidebar]: null,
    },
  },
});
