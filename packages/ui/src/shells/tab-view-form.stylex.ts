import * as stylex from "@stylexjs/stylex";
import { tabViewWidth } from "../primitives/view-width.stylex.ts";
import { space } from "../tokens.stylex.ts";
import { tabViewForm, tabViewTokens } from "./tab-view.stylex.ts";

const SIDEBAR_PADDING_INLINE = space._2;
/** The `header` alone, and the `header` with the button at the end of its first line. */
const ONE_COLUMN = "minmax(0, 1fr)";
const WITH_TOGGLE = "minmax(0, 1fr) auto";
/** A screen whose list shows in the sidebar, with the destinations above it. */
const HAS_LIST_WITH_NAV = ":has([data-split-view-nav])";
/** The same, but not a list that gives way to a detail below 72rem. */
const HAS_LIST_WITH_NAV_ALWAYS = ':has([data-split-view-nav="always"])';
/** A screen with a detail beside its content. */
const HAS_DETAIL = ':has([data-split-view-column="detail"])';

// StyleX puts a plain value of a custom property outside its cascade layers,
// where it wins over a value in a container query. So each value here is in a
// query, and a view in the content of another sets each of them again.
/** @internal */
export const formStyles = stylex.create({
  // Below 72rem, the sidebar gives way to the rail while a detail shows beside
  // the content.
  form: {
    [tabViewForm.icons]: {
      default: null,
      [tabViewWidth.rail]: "block",
      [tabViewWidth.sidebarNarrow]: { default: "none", [HAS_DETAIL]: "block" },
      [tabViewWidth.sidebarWide]: "none",
    },
    [tabViewForm.labels]: {
      default: null,
      [tabViewWidth.rail]: "none",
      [tabViewWidth.sidebarNarrow]: { default: "block", [HAS_DETAIL]: "none" },
      [tabViewWidth.sidebarWide]: "block",
    },
    [tabViewForm.railDisplay]: {
      default: null,
      [tabViewWidth.rail]: "flex",
      [tabViewWidth.sidebarNarrow]: {
        default: "flex",
        [HAS_LIST_WITH_NAV_ALWAYS]: "none",
      },
      [tabViewWidth.sidebarWide]: {
        default: "flex",
        [HAS_LIST_WITH_NAV]: "none",
      },
    },
    [tabViewForm.toggleDisplay]: {
      default: null,
      [tabViewWidth.belowSidebar]: "none",
      [tabViewWidth.sidebarNarrow]: {
        default: "inline-flex",
        [HAS_DETAIL]: "none",
      },
      [tabViewWidth.sidebarWide]: "inline-flex",
    },
    [tabViewForm.topColumns]: {
      default: null,
      [tabViewWidth.rail]: ONE_COLUMN,
      [tabViewWidth.sidebarNarrow]: {
        default: WITH_TOGGLE,
        [HAS_DETAIL]: ONE_COLUMN,
      },
      [tabViewWidth.sidebarWide]: WITH_TOGGLE,
    },
    [tabViewForm.toggleRow]: {
      default: null,
      [tabViewWidth.rail]: "auto",
      [tabViewWidth.sidebarNarrow]: { default: "1", [HAS_DETAIL]: "auto" },
      [tabViewWidth.sidebarWide]: "1",
    },
    [tabViewForm.inlineSize]: {
      default: null,
      [tabViewWidth.rail]: tabViewTokens.railInlineSize,
      [tabViewWidth.sidebarNarrow]: {
        default: tabViewTokens.sidebarInlineSize,
        [HAS_DETAIL]: tabViewTokens.railInlineSize,
      },
      [tabViewWidth.sidebarWide]: tabViewTokens.sidebarInlineSize,
    },
    [tabViewForm.paddingInline]: {
      default: null,
      [tabViewWidth.rail]: space._0,
      [tabViewWidth.sidebarNarrow]: {
        default: SIDEBAR_PADDING_INLINE,
        [HAS_DETAIL]: space._0,
      },
      [tabViewWidth.sidebarWide]: SIDEBAR_PADDING_INLINE,
    },
    [tabViewForm.slotJustify]: {
      default: null,
      [tabViewWidth.rail]: "center",
      [tabViewWidth.sidebarNarrow]: {
        default: "flex-start",
        [HAS_DETAIL]: "center",
      },
      [tabViewWidth.sidebarWide]: "flex-start",
    },
  },
  // The visitor collapsed the sidebar: the rail of icons shows at each width
  // from 34rem. After `form`.
  collapsed: {
    [tabViewForm.icons]: {
      default: null,
      [tabViewWidth.fromRail]: "block",
    },
    [tabViewForm.labels]: {
      default: null,
      [tabViewWidth.fromRail]: "none",
    },
    [tabViewForm.railDisplay]: {
      default: null,
      [tabViewWidth.fromRail]: "flex",
    },
    [tabViewForm.topColumns]: {
      default: null,
      [tabViewWidth.fromRail]: ONE_COLUMN,
    },
    // Under the first line of the `header`, which is the closest place to
    // the end of that line, where the button is in the sidebar.
    [tabViewForm.toggleRow]: {
      default: null,
      [tabViewWidth.fromRail]: "2",
    },
    [tabViewForm.inlineSize]: {
      default: null,
      [tabViewWidth.fromRail]: tabViewTokens.railInlineSize,
    },
    [tabViewForm.paddingInline]: {
      default: null,
      [tabViewWidth.fromRail]: space._0,
    },
    [tabViewForm.slotJustify]: {
      default: null,
      [tabViewWidth.fromRail]: "center",
    },
  },
});
