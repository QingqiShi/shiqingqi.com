import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../tokens.stylex.ts";

const SELECTED =
  ":is([aria-pressed=true], [aria-checked=true], [aria-selected=true], [aria-current]:not([aria-current=false], [aria-current='']))";

/**
 * The background of an item that is not selected. Set it the way
 * `cornerTokens.height` is set: override the var in a local `stylex.create`.
 */
export const selectedTokens = stylex.defineVars({
  rest: "transparent",
});

/**
 * The selected state, read from the ARIA state already on the element:
 * `aria-pressed`, `aria-checked` or `aria-selected` set to `true`, or any
 * `aria-current` other than `false`. Set the attribute and the look follows.
 *
 * `quiet` is the default: a background only, for an item that only has to
 * stand out from its siblings, such as a menu row, a nav link, a tab or a
 * segmented choice. `marked` adds the accent border and tint, for a choice
 * that decides what the visitor does next, such as a picked option card. Give
 * a `marked` element a border width; `marked` paints only its colour.
 *
 * Each strength owns the element's `backgroundColor`, including its hover, and
 * `marked` also owns `borderColor`. Set the rest background through
 * `selectedTokens.rest`, not on the element.
 */
export const selected = stylex.create({
  quiet: {
    backgroundColor: {
      default: selectedTokens.rest,
      [pointer.canHover]: {
        default: null,
        ":hover:not(:disabled)": color.bgControlHover,
      },
      // eslint-disable-next-line @stylexjs/valid-styles -- the rule does not know :is(), which reads the ARIA state
      [SELECTED]: {
        default: color.bgControlSelected,
        // StyleX puts a hover in a media query after a bare state, so the
        // selected value repeats there to stay on top under the pointer.
        ":hover": {
          default: null,
          [pointer.canHover]: color.bgControlSelected,
        },
      },
    },
  },
  marked: {
    borderColor: {
      default: "transparent",
      [SELECTED]: color.borderAccent,
    },
    backgroundColor: {
      default: selectedTokens.rest,
      [pointer.canHover]: {
        default: null,
        ":hover:not(:disabled)": color.bgControlHover,
      },
      // eslint-disable-next-line @stylexjs/valid-styles -- the rule does not know :is(), which reads the ARIA state
      [SELECTED]: {
        default: color.bgAccentSubtle,
        ":hover": {
          default: null,
          [pointer.canHover]: color.bgAccentSubtle,
        },
      },
    },
  },
});
