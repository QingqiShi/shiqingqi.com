import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { gray } from "@tuja/ui/palette/gray.stylex";

/** The light `color.background` of Finance. */
export const FINANCE_LIGHT_CANVAS = gray._92;

/**
 * The light canvas is darker than the design system's, so that the islands
 * of the shell stand apart from it.
 */
export const financeTheme = stylex.createTheme(color, {
  background: `light-dark(${FINANCE_LIGHT_CANVAS}, ${gray._0})`,
});
