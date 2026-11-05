import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { gray, gray_rgb } from "@tuja/ui/palette/gray.stylex";

/** The light `color.bgCanvas` of Assistant. */
export const ASSISTANT_LIGHT_CANVAS = gray._92;

/**
 * The look of Finance: the accent is ink, not the design system's purple, and
 * the light canvas is darker than the design system's, so that the islands of
 * the shell stand apart from it.
 */
export const assistantTheme = stylex.createTheme(color, {
  bgCanvas: `light-dark(${ASSISTANT_LIGHT_CANVAS}, ${gray._0})`,
  fgControlSelected: `light-dark(${gray._13}, ${gray._92})`,
  // A white thumb sits on this track in both themes.
  bgControlStrongSelected: `light-dark(${gray._13}, ${gray._50})`,
  bgAccent: `light-dark(${gray._13}, ${gray._92})`,
  bgAccentHover: `light-dark(${gray._30}, ${gray._80})`,
  bgAccentSubtle: `light-dark(rgba(${gray_rgb._13}, 0.06), rgba(${gray_rgb._92}, 0.1))`,
  borderAccent: `light-dark(${gray._13}, ${gray._92})`,
  fgAccent: `light-dark(${gray._13}, ${gray._92})`,
  fgOnAccent: `light-dark(${gray._100}, ${gray._0})`,
});
