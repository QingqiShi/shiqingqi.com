import * as stylex from "@stylexjs/stylex";

/** The `Accessory` dial, set by the layout that holds it. */
export const accessoryTokens = stylex.defineVars({
  /**
   * The padding after the content that holds the accessory. Set it where
   * that padding is set, so that the accessory rests where it sticks at the
   * end of the content, and the content ends as far from the bottom with
   * the control in the rail as with no accessory.
   */
  contentPaddingBlockEnd: "0px",
});

/**
 * Where the control of an `Accessory` is. It is in the rail in an app opened
 * from the Home Screen, where the safe area at the inline end of the screen
 * is `4rem` wide or more and the island of the accessory reaches that edge,
 * as on a phone whose status bar is at the side: in that column, under the
 * status bar, at the bottom. Elsewhere it floats at the bottom end of the
 * content. A control in an accessory can take a look for each.
 */
export const accessoryQueries = stylex.defineConsts({
  rail: "@container accessory (width >= 4rem)",
  floating: "@container accessory (width < 4rem)",
});
