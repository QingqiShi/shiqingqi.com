import * as stylex from "@stylexjs/stylex";
import { islandTokens } from "../../surfaces/island.stylex.ts";
import { space } from "../../tokens.stylex.ts";
import {
  splitViewQueries,
  splitViewWidths,
} from "../navigation-split-view-layout.stylex.ts";
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
  collapsed: {
    inlineSize: splitViewWidths.collapsedSidebar,
  },
  fullContent: {
    paddingInline: space._3,
  },
  collapsedContent: {
    paddingInline: space._1,
  },
  hidden: {
    position: "absolute",
    insetBlockStart: islandTokens.insetBlockStart,
    insetBlockEnd: islandTokens.insetBlockEnd,
    insetInlineStart: islandTokens.insetInlineStart,
    visibility: "hidden",
  },
  collapsedBesideDetail: {
    position: "relative",
    visibility: "visible",
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
  collapsedBesideContent: {
    position: {
      default: "absolute",
      [splitViewQueries.contentBesideCollapsed]: "relative",
    },
    insetBlockStart: {
      default: islandTokens.insetBlockStart,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    insetBlockEnd: {
      default: islandTokens.insetBlockEnd,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    insetInlineStart: {
      default: islandTokens.insetInlineStart,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideCollapsed]: "visible",
    },
  },
});
