import * as stylex from "@stylexjs/stylex";
import { tabBarTokens } from "../actions/tab-bar.stylex.ts";
import { safeArea, space } from "../tokens.stylex.ts";

const BAR_INSET_BLOCK_END = `max(${space._3}, calc(env(safe-area-inset-bottom) + ${space._1}))`;

/** The `TabView` dial. */
export const tabViewTokens = stylex.defineVars({
  /**
   * The strip from the bottom of the screen to the top of the floating tab
   * bar, safe area included, below 34rem, and 0 from 34rem, where the
   * rail holds the destinations. Inside a `TabView`, it follows the width of
   * the view, not of the screen. `TabView` does not pad its content by it:
   * each layout in it keeps its content, floating actions and sticky
   * footers above it. `NavigationSplitView` does so for its columns.
   */
  barClearance: {
    default: `calc(${tabBarTokens.blockSize} + ${BAR_INSET_BLOCK_END})`,
    "@media (min-width: 34rem)": "0px",
  },
  /** The gap between the bottom of the screen and the floating tab bar. */
  barInsetBlockEnd: BAR_INSET_BLOCK_END,
  /** The width of the icon rail from 34rem. */
  railInlineSize: "4rem",
  /**
   * The width of the sidebar, with or without a list under the destinations,
   * so that it stays as wide from one screen to the next.
   */
  sidebarInlineSize: "17.5rem",
});

/**
 * The form of the rail, which the view sets for each width: the `display` of the parts of the icon rail and of the
 * labelled sidebar, and the width, the inline padding and the alignment of
 * the slots of the column that holds them.
 *
 * @internal
 */
export const tabViewForm = stylex.defineVars({
  icons: "block",
  labels: "none",
  railDisplay: "flex",
  toggleDisplay: "none",
  topColumns: "minmax(0, 1fr)",
  toggleRow: "auto",
  inlineSize: "4rem",
  paddingInline: "0px",
  slotJustify: "center",
});

const EDGE_BLOCK_START = `calc(${space._3} + ${safeArea.blockStart})`;
const EDGE_BLOCK_END = `calc(${space._3} + env(safe-area-inset-bottom))`;

/**
 * The block paddings of a sidebar and of the rail, for the rail of a `TabView`
 * and for the sidebar of a `NavigationSplitView`, so that both put their first
 * and last lines at the same place.
 *
 * CSS cannot read the radius of a rounded display corner. The touch values
 * assume a radius of 55px, as on an iPhone Pro. With them, a 40px mark at
 * the top of the rail and a 32px avatar at the bottom are about 11px from
 * the curve, which is almost their distance from the side of the screen. A
 * touch screen can have rounded corners and give no safe area at a corner,
 * such as the inner screen of a foldable phone.
 *
 * @internal
 */
export const sidebarEdge = stylex.defineVars({
  paddingBlockStart: {
    default: EDGE_BLOCK_START,
    "@media (pointer: coarse)": `max(${EDGE_BLOCK_START}, 2.5rem)`,
  },
  paddingBlockEnd: {
    default: EDGE_BLOCK_END,
    "@media (pointer: coarse)": `max(${EDGE_BLOCK_END}, ${space._5})`,
  },
});
