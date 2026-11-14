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
import { tabViewWidth } from "../../primitives/view-width.stylex.ts";
import {
  border,
  controlHeight,
  layer,
  rhythm,
  safeArea,
  shadow,
  space,
} from "../../tokens.stylex.ts";
import { splitViewQueries } from "../navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "../navigation-split-view.stylex.ts";
import { sidebarEdge, tabViewTokens } from "../tab-view.stylex.ts";

const CONTENT_GUTTER_START = `max(${space._4}, env(safe-area-inset-left))`;
const CONTENT_GUTTER_END = `max(${space._4}, env(safe-area-inset-right))`;
const PAGE_COLUMN_MARGIN = `calc((100% - ${pageColumnTokens.inlineSize}) / 2 + ${space._4})`;
const CONTENT_PADDING_BLOCK_START = `calc(${space._4} + ${safeArea.blockStart})`;
const CONTENT_PADDING_BLOCK_END = `calc(${space._6} + ${splitViewTokens.columnInsetBlockEnd})`;
/** Above the tab bar below 34rem, and above the safe area from 34rem up. */
const ACCESSORY_INSET_BLOCK_END = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

const SIDEBAR_INLINE_SIZE = `calc(${splitViewTokens.sidebarInlineSize} + env(safe-area-inset-left))`;
const CORNER_RADIUS = border.radius_3;

// A column beside the sidebar fill has round corners on that side. The page
// scrolls the column, so a corner of the column itself would scroll away.
// Thus a small box sticks to each of the two corners of the screen that the
// column covers, and paints the sidebar fill outside the curve.
/** @internal */
export const cornerStyles = stylex.create({
  // The box that sticks has no height, so it takes no room in the column, and
  // it is narrow, so it stays clear of the point at the top centre that iOS
  // Safari samples for the status bar colour.
  anchor: {
    position: "sticky",
    zIndex: layer.raised,
    flexShrink: 0,
    alignSelf: "flex-start",
    inlineSize: CORNER_RADIUS,
    blockSize: 0,
    pointerEvents: "none",
  },
  blockStart: {
    insetBlockStart: 0,
  },
  blockEnd: {
    insetBlockEnd: 0,
  },
  // The spread shadow of the round box fills the square around the curve.
  curve: {
    position: "absolute",
    insetInlineStart: 0,
    inlineSize: CORNER_RADIUS,
    blockSize: CORNER_RADIUS,
    overflow: "clip",
    "::before": {
      content: "''",
      position: "absolute",
      inset: 0,
      boxShadow: `0 0 0 ${CORNER_RADIUS} ${color.sidebar}`,
    },
  },
  curveBlockStart: {
    insetBlockStart: 0,
    "::before": {
      borderStartStartRadius: CORNER_RADIUS,
      cornerShape: "squircle",
    },
  },
  curveBlockEnd: {
    insetBlockEnd: 0,
    "::before": {
      borderEndStartRadius: CORNER_RADIUS,
      cornerShape: "squircle",
    },
  },
  // In a `TabView`, the rail or the sidebar is beside the content from 34rem.
  besideRail: {
    display: { default: "none", [tabViewWidth.fromRail]: "block" },
  },
  // The list is a page beside the rail only where the rail of icons shows.
  pageBesideRail: {
    display: { default: "none", [tabViewWidth.rail]: "block" },
  },
  // Outside a `TabView`, only the sidebar of the view is beside the content.
  besideSidebar: {
    display: {
      default: "none",
      [splitViewQueries.contentBesideSidebar]: "block",
    },
  },
});

/** @internal */
export const columnStyles = stylex.create({
  // The column clips what it holds, so its scroller goes inside it.
  column: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
    backgroundColor: color.background,
    overflow: "clip",
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
  // The box is only as wide as its button, so that the page under the rest of
  // the line still takes the pointer. It holds a little above its place at
  // rest, so that it is stuck only after the content starts to scroll.
  expand: {
    position: "sticky",
    insetBlockStart: `calc(${CONTENT_PADDING_BLOCK_START} - ${space._2})`,
    zIndex: layer.raised,
    alignSelf: "flex-start",
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
    backgroundColor: color.card,
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

// Where the view fills the screen, the page scrolls the content, so that the
// browser can shrink its bars as the page scrolls. A view in a box that does
// not fill the screen always scrolls its columns, as the page does not scroll
// them.
/** @internal */
export const pageScrollStyles = stylex.create({
  // The page that shows is in the flow.
  page: {
    position: "relative",
  },
  // A page beside it is as tall as its content, and `createPageScroll` moves it
  // to show its scroll.
  pageAside: {
    position: "absolute",
    insetBlockEnd: "auto",
  },
  scroller: {
    overflowY: "visible",
  },
  content: {
    minBlockSize: { default: "100dvh", "@media print": "auto" },
  },
  // Chrome sticks only to a scroller of the column, not to the page.
  chrome: {
    position: "static",
  },
});

// The sidebar scrolls with the page only where it is a page of the stack.
// Beside the content, it stays on the screen and scrolls its own list.
/** @internal */
export const stackedPageScrollStyles = stylex.create({
  page: {
    position: {
      default: "absolute",
      [splitViewQueries.noSidebarBeside]: "relative",
    },
  },
  pageAside: {
    position: "absolute",
    insetBlockEnd: {
      default: null,
      [splitViewQueries.noSidebarBeside]: "auto",
    },
  },
  scroller: {
    overflowY: {
      default: "auto",
      [splitViewQueries.noSidebarBeside]: "visible",
    },
  },
  content: {
    minBlockSize: {
      default: "100%",
      [splitViewQueries.noSidebarBeside]: "100dvh",
    },
  },
  chrome: {
    position: {
      default: "sticky",
      [splitViewQueries.noSidebarBeside]: "static",
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
      default: 0,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    inlineSize: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]: SIDEBAR_INLINE_SIZE,
    },
  },
  // What stays above the list of the sidebar while the list scrolls under it,
  // such as the `header` of a `TabView`. Its paddings are those of the rail
  // of a `TabView`, so that the `header` and the destinations under it keep
  // their place from one screen to the next.
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
  // too, and its `footer` under it (`sidebarFooterOnPage`). After their bases.
  sidebarHeaderOnPage: {
    display: "flex",
    paddingBlockStart: {
      default: CONTENT_PADDING_BLOCK_START,
      [splitViewQueries.contentBesideSidebar]: `calc(${space._2} + ${safeArea.blockStart})`,
    },
  },
  // Of the list, and of its `header` and `footer` on a page. After those.
  sidebarGutters: {
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
  // This and `sidebarContentAboveFooter` go after `sidebarContent`.
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
  // as far from the bottom as from the side. Over a home indicator, it keeps
  // clear of the safe area, which clears a rounded display corner. After
  // `sidebarFooter`.
  sidebarFooterOwn: {
    paddingBlockEnd: `max(${space._2}, env(safe-area-inset-bottom))`,
  },
  sidebarFooterOnPage: {
    display: "flex",
    paddingBlockEnd: {
      default: CONTENT_PADDING_BLOCK_END,
      [splitViewQueries.contentBesideSidebar]: `max(${space._2}, env(safe-area-inset-bottom))`,
    },
  },
  sidebarContentAboveFooter: {
    paddingBlockEnd: {
      default: 0,
      [splitViewQueries.contentBesideSidebar]: space._2,
    },
  },
  contentColumn: {
    backgroundColor: {
      default: "transparent",
      [splitViewQueries.contentBesideSidebar]: color.background,
    },
  },
  contentPage: {
    backgroundColor: {
      default: color.background,
      [splitViewQueries.contentBesideSidebar]: null,
    },
  },
  // After `sidebarStyles.fullBesideContent`.
  contentAtRoot: {
    insetInlineEnd: {
      default: 0,
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
