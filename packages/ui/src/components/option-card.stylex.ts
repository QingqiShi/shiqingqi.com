import * as stylex from "@stylexjs/stylex";
import { border, color, font } from "../tokens.stylex.ts";

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
    color: color.textMain,
  },
  selected: {
    borderColor: { default: color.accent, ":hover": color.accent },
    backgroundColor: {
      default: color.surfaceAccentSubtle,
      ":hover": color.surfaceAccentMuted,
    },
    boxShadow: `inset 0 0 0 ${border.size_1} ${color.accent}`,
  },
  disabled: {
    cursor: "not-allowed",
    opacity: 0.6,
    borderColor: {
      default: color.neutralBorder,
      ":hover": color.neutralBorder,
    },
    backgroundColor: {
      default: color.bgInteractiveDisabled,
      ":hover": color.bgInteractiveDisabled,
    },
    boxShadow: "none",
  },
});
