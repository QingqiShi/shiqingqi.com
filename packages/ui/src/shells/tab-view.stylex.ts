import * as stylex from "@stylexjs/stylex";
import { tabBarTokens } from "../actions/tab-bar.stylex.ts";
import { breakpoints } from "../breakpoints.stylex.ts";
import { space } from "../tokens.stylex.ts";

const BAR_INSET_BLOCK_END = `max(${space._3}, calc(env(safe-area-inset-bottom) + ${space._1}))`;

/** The `TabView` dial. */
export const tabViewTokens = stylex.defineVars({
  /**
   * The strip from the bottom of the screen to the top of the floating tab
   * bar, safe area included, below `md`, and 0 at `md` and wider, where the
   * rail holds the destinations. Inside a `TabView`, it follows the width of
   * the view, not of the screen. `TabView` does not pad its content by it:
   * each layout in it keeps its content, floating actions and sticky
   * footers above it. `NavigationSplitView` does so for its columns.
   */
  barClearance: {
    default: `calc(${tabBarTokens.blockSize} + ${BAR_INSET_BLOCK_END})`,
    [breakpoints.md]: "0px",
  },
  /** The gap between the bottom of the screen and the floating tab bar. */
  barInsetBlockEnd: BAR_INSET_BLOCK_END,
  /** The width of the icon rail at `md` and wider. */
  railInlineSize: "4rem",
  /** The width of the labelled sidebar. */
  sidebarInlineSize: "15rem",
});

/**
 * The form of the rail, which the view sets for each value of `rail` and
 * each width: the `display` of the parts of the icon rail and of the
 * labelled sidebar, and the width, the inline padding and the alignment of
 * the slots of the column that holds them.
 *
 * @internal
 */
export const tabViewForm = stylex.defineVars({
  icons: "block",
  labels: "none",
  inlineSize: "4rem",
  paddingInline: "0px",
  slotJustify: "center",
});
