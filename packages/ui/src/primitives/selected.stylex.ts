import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";

// StyleX cannot read a selector from another module, and it compiles a
// `defineConsts` key as an at-rule, so that selector does not match this
// element. Keep this the same as `SELECTED` in quiet-surface.stylex.ts.
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
 * The accent look of the selected state, read from the ARIA state already on
 * the element: `aria-pressed`, `aria-checked` or `aria-selected` set to `true`,
 * or any `aria-current` other than `false`. Set the attribute and the look
 * follows. Use it for a choice that decides what the visitor does next. An
 * item that only has to stand out from its siblings takes
 * `quietSurface.interactive`.
 *
 * `marked` owns the element's `backgroundColor`, including its hover, and its
 * `borderColor`. Set the rest background through `selectedTokens.rest`, not on
 * the element, and give the element a border width.
 */
export const selected = stylex.create({
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
