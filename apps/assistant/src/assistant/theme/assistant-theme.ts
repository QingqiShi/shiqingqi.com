import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { gray } from "@tuja/ui/palette/gray.stylex";

/** The light `color.background` of Assistant. */
export const ASSISTANT_LIGHT_CANVAS = gray._92;

/**
 * The light canvas is darker than the design system's, so that the islands
 * of the shell stand apart from it.
 */
export const assistantTheme = stylex.createTheme(color, {
  background: `light-dark(${ASSISTANT_LIGHT_CANVAS}, ${gray._0})`,
});
