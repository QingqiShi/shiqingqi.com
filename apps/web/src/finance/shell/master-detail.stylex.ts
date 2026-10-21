import * as stylex from "@stylexjs/stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";

export const masterDetailTokens = stylex.defineVars({
  /**
   * The columns at `lg` and wider, with a `rhythm.group` gap: the list and
   * the detail share the width until the list reaches 32rem, a row that the
   * eye can still read across. The detail takes the rest.
   */
  columns: `min(32rem, calc((100% - ${rhythm.group}) / 2)) minmax(0, 1fr)`,
  /** The height of the pane beside the list: the screen, less a gap above and below. */
  paneBlockSize: `calc(100dvh - ${space._8})`,
});
