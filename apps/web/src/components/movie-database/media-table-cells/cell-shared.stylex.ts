import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";

/**
 * The chrome more than one media table cell renders: the em dash a missing
 * value falls back to, and the tabular-figure treatment every number shares.
 * Each cell keeps the styles only it uses in its own module.
 */
export const cellShared = stylex.create({
  empty: {
    color: color.textSubtle,
  },
  numeric: {
    color: color.textMuted,
    fontSize: font.uiBodySmall,
    fontVariantNumeric: "tabular-nums",
  },
});
