import * as stylex from "@stylexjs/stylex";
import { border, color, font } from "../../tokens.stylex.ts";

/**
 * The selectable-card skin: compose it over `cardSurface.base` +
 * `cardSurface.interactive` from `card.stylex`, which already carry the
 * border, radius, hover, and focus ring. This only adds the option-specific
 * parts — a full-width button box and the selected/disabled states.
 */
export const optionCardSurface = stylex.create({
  base: {
    boxSizing: "border-box",
    position: "relative",
    inlineSize: "100%",
    textAlign: "start",
    fontFamily: font.family,
    color: color.fg,
  },
  selected: {
    borderColor: color.borderAccent,
    backgroundColor: color.bgAccentSubtle,
    boxShadow: `inset 0 0 0 ${border.size_1} ${color.borderAccent}`,
  },
  disabled: {
    cursor: "not-allowed",
    opacity: 0.6,
    borderColor: color.border,
    backgroundColor: color.bgControlDisabled,
    boxShadow: "none",
  },
});
