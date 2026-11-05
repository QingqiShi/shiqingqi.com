import * as stylex from "@stylexjs/stylex";
import { islandTokens } from "../../surfaces/island.stylex.ts";
import { controlHeight, layer, rhythm, space } from "../../tokens.stylex.ts";
import { headerControlsTokens } from "../header-controls.stylex.ts";
import {
  splitViewDisplay,
  splitViewQueries,
} from "../navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "../navigation-split-view.stylex.ts";
import { tabViewTokens } from "../tab-view.stylex.ts";

/** @internal */
export const viewFrameStyles = stylex.create({
  // The box of the view that fills the screen, for `splitViewQueries.pageScrolls`,
  // as a `TabView` is the box of a view in it.
  screen: {
    containerName: "split-view-screen",
    containerType: "inline-size",
  },
  // The view fills the screen and the page does not scroll, except on a screen
  // narrower than 30rem. Inside a `TabView` below `md`, the view goes under the
  // floating tab bar, and each column keeps its content above the bar. The
  // displays start again from their defaults in a view in a column of another.
  view: {
    position: "relative",
    containerType: "inline-size",
    blockSize: "100dvh",
    maxBlockSize: "100%",
    [splitViewDisplay.stacked]: "none",
    [splitViewDisplay.unstacked]: "contents",
    [splitViewDisplay.noFullSidebar]: "contents",
  },
  // The copies of the Shared elements fly over the columns.
  flights: {
    position: "absolute",
    inset: 0,
    zIndex: layer.raised,
    overflow: "clip",
    pointerEvents: "none",
  },
  // Each column is an island on the canvas. Where the content fills the
  // view, as on a phone, the islands have no gaps and no corners.
  columns: {
    [islandTokens.radius]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetBlockStart]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetBlockEnd]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetInlineStart]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetInlineEnd]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    // The part of the bar or of the safe area that the gap under the
    // islands does not already clear.
    [splitViewTokens.columnInsetBlockEnd]: `max(0px, max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom)) - ${islandTokens.insetBlockEnd})`,
    position: "relative",
    blockSize: "100%",
    overflow: "clip",
  },
  columnsWithoutBar: {
    [tabViewTokens.barClearance]: "0px",
  },
  // No rail of a `TabView` takes the safe area at the inline start.
  columnsOnScreen: {
    [islandTokens.insetInlineStart]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
      [splitViewQueries.besideOthers]: `max(${rhythm.tight}, env(safe-area-inset-left))`,
    },
  },
  // The room of the menu button of a drawer, which floats over the page.
  columnsWithMenu: {
    [headerControlsTokens.clearance]: {
      default: null,
      [splitViewQueries.noSidebarBeside]: `calc(${controlHeight.md} + 2 * ${space._3} + env(safe-area-inset-top))`,
    },
    [headerControlsTokens.inlineEndClearance]: {
      default: null,
      [splitViewQueries.noSidebarBeside]: `calc(${controlHeight.md} + ${rhythm.tight})`,
    },
  },
  fullSidebarBesideContent: {
    [splitViewDisplay.noFullSidebar]: {
      default: null,
      [splitViewQueries.contentBesideSidebar]: "none",
    },
  },
  // A custom property set in a container query goes into a cascade layer, and one
  // set without a condition does not. Thus these set a display of
  // `splitViewDisplay` only in a container query, and the default comes from `view`.
  stackedBelowCollapsed: {
    [splitViewDisplay.stacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "contents",
    },
    [splitViewDisplay.unstacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "none",
    },
  },
  stackedBelowSidebar: {
    [splitViewDisplay.stacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "contents",
      [splitViewQueries.contentBesideCollapsed]: "contents",
    },
    [splitViewDisplay.unstacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "none",
      [splitViewQueries.contentBesideCollapsed]: "none",
    },
  },
});

// Where the view fills a screen narrower than 30rem, the page scrolls the
// content, and it does so also on paper, which has no scroller to show the rest.
// A view in a box that does not fill the screen always scrolls its columns, as
// the page does not scroll them, though a view around it can scroll with the page.
/** @internal */
export const viewFramePageScrollStyles = stylex.create({
  view: {
    blockSize: {
      default: "100dvh",
      [splitViewQueries.pageScrolls]: "auto",
      "@media print": "auto",
    },
    maxBlockSize: {
      default: "100%",
      [splitViewQueries.pageScrolls]: "none",
      "@media print": "none",
    },
    // `createPageScroll` sets the scroll and moves the pages with `top`. WebKit
    // anchors the scroll through both, and adds the move to the scroll.
    overflowAnchor: {
      default: null,
      [splitViewQueries.pageScrolls]: "none",
    },
  },
  columns: {
    blockSize: {
      default: "100%",
      [splitViewQueries.pageScrolls]: "auto",
      "@media print": "auto",
    },
  },
});
