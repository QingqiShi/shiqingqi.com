import * as stylex from "@stylexjs/stylex";
import { gray, gray_rgb } from "@tuja/ui/palette/gray.stylex";
import { color } from "@tuja/ui/tokens.stylex";

/** The light `color.bgCanvas` of Finance. */
export const FINANCE_LIGHT_CANVAS = gray._92;

/**
 * Finance's accent is ink, not the design system's purple. The mark is green,
 * and green already means success and money that goes up. The light canvas
 * is darker than the design system's, so that the white islands of the
 * shell stand apart from it.
 */
export const financeTheme = stylex.createTheme(color, {
  bgCanvas: `light-dark(${FINANCE_LIGHT_CANVAS}, ${gray._0})`,
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

export const FINANCE_PATH = /^(?:\/(?:en|zh))?\/finance(?:\/|$)/;

export function isFinancePath(pathname: string | null) {
  return pathname !== null && FINANCE_PATH.test(pathname);
}
