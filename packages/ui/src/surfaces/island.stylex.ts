import * as stylex from "@stylexjs/stylex";
import { border, color, rhythm } from "../tokens.stylex.ts";

// The gap between two islands, and the least inset of an island from the
// edge of the frame.
const GAP = rhythm.tight;

/**
 * The Island dial, set the way `cornerTokens.height` is. Each inset is the
 * space from an edge of the frame to the islands: the gap between two
 * islands, or the safe area where that is more. The inline start takes no
 * safe area, because a rail beside the frame, such as the one of a
 * `TabView`, takes it. Where one island fills the screen, as on a phone,
 * set every token to `0px`.
 */
export const islandTokens = stylex.defineVars({
  radius: border.radius_3,
  insetBlockStart: `max(${GAP}, env(safe-area-inset-top))`,
  insetBlockEnd: `max(${GAP}, env(safe-area-inset-bottom))`,
  insetInlineStart: GAP,
  insetInlineEnd: `max(${GAP}, env(safe-area-inset-right))`,
});

/**
 * The Island skin. An island is a pane of an app shell, such as a column of
 * a `NavigationSplitView`, that floats on the canvas. The canvas shows only
 * in the gaps between the islands, so no border or shadow divides them.
 *
 * - `frame` holds the islands side by side: it insets them from its edges
 *   and puts the gap between them.
 * - `base` is one island. It clips what it holds to its corners, so its
 *   scroller goes inside it.
 *
 * A card in an island takes `cardSurface`: the fill of the island and a
 * hairline edge, so that it reads one level down, not as another island.
 */
export const islandSurface = stylex.create({
  frame: {
    display: "flex",
    gap: rhythm.tight,
    boxSizing: "border-box",
    paddingBlockStart: islandTokens.insetBlockStart,
    paddingBlockEnd: islandTokens.insetBlockEnd,
    paddingInlineStart: islandTokens.insetInlineStart,
    paddingInlineEnd: islandTokens.insetInlineEnd,
  },
  base: {
    backgroundColor: color.bgSurface,
    borderRadius: islandTokens.radius,
    cornerShape: "squircle",
    overflow: "clip",
  },
});
