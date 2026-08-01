import * as stylex from "@stylexjs/stylex";
import { border, color, font } from "../tokens.stylex.ts";

/**
 * The selectable-card skin, exposed as composable StyleX so a consumer can put
 * the same surface on an element `OptionCard` can't be. Compose it over
 * `cardSurface.base` + `cardSurface.interactive` from `card.stylex`, which
 * already carry the border, radius, hover, and focus ring — this only adds the
 * parts that make a card an option: a full-width button box and the selected /
 * disabled states.
 *
 * `selected` paints an inset ring rather than thickening the border, so the
 * card's box stays the same size and nothing shifts as the visitor picks. Both
 * states re-declare the hover-sensitive properties so they win over
 * `interactive`'s hover (last write wins per property).
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
