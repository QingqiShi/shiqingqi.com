import * as stylex from "@stylexjs/stylex";
import { tabBarTokens } from "../actions/tab-bar.stylex.ts";
import { color } from "../color.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  motionKeyframes,
} from "../primitives/motion.stylex.ts";
import { pageGutter } from "../primitives/page-column.stylex.ts";
import { tabViewWidth } from "../primitives/view-width.stylex.ts";
import { layer, rhythm, safeArea, space } from "../tokens.stylex.ts";
import { headerControlsTokens } from "./header-controls.stylex.ts";
import { splitViewQueries } from "./navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "./navigation-split-view.stylex.ts";
import { sidebarEdge, tabViewForm, tabViewTokens } from "./tab-view.stylex.ts";

/** @internal */
export const tabViewStyles = stylex.create({
  container: {
    containerName: "tab-view",
    containerType: "inline-size",
    blockSize: "100%",
  },
  // StyleX writes a plain custom property outside its cascade layers, but a
  // custom property in a container query inside them. Thus a plain default
  // wins over the container query, and each form must set its own value.
  root: {
    // No bar floats over the top of the page, so sticky chrome parks under
    // the status bar.
    [headerControlsTokens.clearance]: {
      default: null,
      [tabViewWidth.bar]: safeArea.blockStart,
      [tabViewWidth.fromRail]: "0px",
    },
    [tabViewTokens.barClearance]: {
      default: null,
      [tabViewWidth.bar]: `calc(${tabBarTokens.blockSize} + ${tabViewTokens.barInsetBlockEnd})`,
      [tabViewWidth.fromRail]: "0px",
    },
    [splitViewTokens.sidebarInlineSize]: tabViewTokens.sidebarInlineSize,
    position: "relative",
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [tabViewWidth.fromRail]: "auto minmax(0, 1fr)",
    },
    gridTemplateRows: "minmax(0, 1fr)",
    blockSize: "100%",
    backgroundColor: color.sidebar,
    color: color.sidebarForeground,
  },
  // The rail is as tall as the screen, and as tall as its container where
  // that is shorter.
  rail: {
    display: {
      default: "none",
      [tabViewWidth.fromRail]: tabViewForm.railDisplay,
    },
    flexDirection: "column",
    gap: rhythm.item,
    position: "sticky",
    insetBlockStart: 0,
    zIndex: layer.header,
    boxSizing: "border-box",
    inlineSize: `calc(${tabViewForm.inlineSize} + env(safe-area-inset-left))`,
    blockSize: "100dvh",
    maxBlockSize: "100%",
    paddingBlockStart: sidebarEdge.paddingBlockStart,
    paddingBlockEnd: sidebarEdge.paddingBlockEnd,
    paddingInlineStart: `calc(${tabViewForm.paddingInline} + env(safe-area-inset-left))`,
    paddingInlineEnd: tabViewForm.paddingInline,
  },
  // Each child of the `header` is a line. In the sidebar, the button that
  // collapses it is at the end of the first line. In the rail of icons, the
  // button is under the first line of the `header`.
  top: {
    display: "grid",
    gridTemplateColumns: tabViewForm.topColumns,
    alignItems: "center",
    justifyItems: tabViewForm.slotJustify,
    gap: rhythm.tight,
    flexShrink: 0,
    minInlineSize: 0,
  },
  toggle: {
    display: tabViewForm.toggleDisplay,
    gridColumnEnd: -1,
    gridRowStart: tabViewForm.toggleRow,
  },
  slot: {
    display: "flex",
    flexShrink: 0,
    justifyContent: tabViewForm.slotJustify,
    minInlineSize: 0,
  },
  iconsOnly: {
    display: tabViewForm.icons,
  },
  labelsOnly: {
    display: tabViewForm.labels,
  },
  // The `header` and the destinations above the list of a screen, and the
  // `footer` under it, only where that list shows in the sidebar.
  listNav: {
    display: {
      default: "none",
      [splitViewQueries.contentBesideSidebar]: "flex",
    },
    flexDirection: "column",
    gap: rhythm.item,
  },
  // The list of a sidebar starts `space._2` under the `header`. The padding
  // makes that `rhythm.item`, which is the gap in the rail, so that the
  // destinations keep their place from one screen to the next.
  listTop: {
    paddingBlockEnd: `calc(${rhythm.item} - ${space._2})`,
  },
  listRows: {
    marginBlockEnd: rhythm.item,
  },
  listFooter: {
    display: {
      default: "none",
      [splitViewQueries.contentBesideSidebar]: "flex",
    },
    marginBlockStart: "auto",
    marginBlockEnd: 0,
    paddingBlockStart: rhythm.item,
  },
  // The screen rises with a transform. WebKit anchors the scroll of the page
  // through it, and the scroll that a view restores then follows the rise.
  // The rail has the first column, also where it does not show.
  content: {
    position: "relative",
    gridColumnStart: { default: "auto", [tabViewWidth.fromRail]: 2 },
    minInlineSize: 0,
    overflowAnchor: "none",
  },
  screen: {
    display: "contents",
  },
  // A screen can mount while it is hidden, and it must lay out, as a component
  // can measure itself once as it mounts.
  screenHidden: {
    display: "block",
    visibility: "hidden",
    blockSize: 0,
    overflow: "clip",
  },
  reveal: {
    animationName: {
      default: motionKeyframes.fadeIn,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
  },
  // The copy of the form that leaves shows here, before the content in the
  // tree and with no `z-index`, so that the content covers it.
  underContent: {
    position: "absolute",
    inset: 0,
    overflow: "clip",
    pointerEvents: "none",
  },
  // The copies of what moves between the sidebar and the rail show over both.
  flights: {
    position: "absolute",
    inset: 0,
    zIndex: layer.header,
    overflow: "clip",
    pointerEvents: "none",
  },
  // The pill is nearly as wide as the screen, but it is at the bottom, so it
  // never covers the top-centre point that iOS Safari samples for the status
  // bar colour.
  bar: {
    display: { default: "block", [tabViewWidth.fromRail]: "none" },
    position: "fixed",
    insetInlineStart: pageGutter.inlineStart,
    insetInlineEnd: pageGutter.inlineEnd,
    insetBlockEnd: tabViewTokens.barInsetBlockEnd,
    zIndex: layer.header,
  },
});
