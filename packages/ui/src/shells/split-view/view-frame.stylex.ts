import * as stylex from "@stylexjs/stylex";
import { color } from "../../color.stylex.ts";
import { layer } from "../../tokens.stylex.ts";
import {
  splitViewDisplay,
  splitViewQueries,
} from "../navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "../navigation-split-view.stylex.ts";
import { tabViewTokens } from "../tab-view.stylex.ts";

/** @internal */
export const viewFrameStyles = stylex.create({
  // The view is as tall as its content, and the page scrolls it. Inside a
  // `TabView` below 34rem, the view goes under the floating tab bar, and each
  // column keeps its content above the bar. The displays start again from
  // their defaults in a view in a column of another.
  view: {
    position: "relative",
    containerType: "inline-size",
    // `createPageScroll` sets the scroll and moves the pages with `top`. WebKit
    // anchors the scroll through both, and adds the move to the scroll.
    overflowAnchor: "none",
    [splitViewDisplay.stacked]: "none",
    [splitViewDisplay.unstacked]: "contents",
  },
  // A view in a box that does not fill the screen is as tall as that box, and
  // each column scrolls in it.
  viewContained: {
    blockSize: "100dvh",
    maxBlockSize: "100%",
    overflowAnchor: "auto",
  },
  // Outside a `TabView`, a view with a list paints the sidebar fill itself.
  canvas: {
    backgroundColor: color.sidebar,
  },
  // The copies of the Shared elements fly over the columns.
  flights: {
    position: "absolute",
    inset: 0,
    zIndex: layer.raised,
    overflow: "clip",
    pointerEvents: "none",
  },
  // The columns lie side by side and reach the edges of the view.
  columns: {
    // The bar or the safe area under the columns.
    [splitViewTokens.columnInsetBlockEnd]: `max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom))`,
    position: "relative",
    display: "flex",
    overflow: "clip",
  },
  columnsContained: {
    blockSize: "100%",
  },
  columnsWithoutBar: {
    [tabViewTokens.barClearance]: "0px",
  },
  // A custom property set in a container query goes into a cascade layer, and one
  // set without a condition does not. Thus these set a display of
  // `splitViewDisplay` only in a container query, and the default comes from `view`.
  stackedBelowSidebar: {
    [splitViewDisplay.stacked]: {
      default: null,
      [splitViewQueries.noSidebarBeside]: "contents",
    },
    [splitViewDisplay.unstacked]: {
      default: null,
      [splitViewQueries.noSidebarBeside]: "none",
    },
  },
});
