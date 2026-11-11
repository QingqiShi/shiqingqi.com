import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";

// StyleX cannot read a selector from another module, and it compiles a
// `defineConsts` key as an at-rule, so that selector does not match this
// element. Keep the ARIA states the same as `SELECTED` in
// quiet-surface.stylex.ts.
//
// A checked selection mark selects only the nearest list item or row that
// holds it. `:has()` finds a mark at any depth, so an outer box that holds a
// list of such rows must not match too.
const SELECTED =
  ":is([aria-pressed=true], [aria-checked=true], [aria-selected=true], [aria-current]:not([aria-current=false], [aria-current='']), :where(:has([data-selection-mark]:checked):not(:has(:is(li, [role=listitem], [role=row], [role=option]) [data-selection-mark]:checked))))";

/**
 * The background of an item that is not selected. Set it the way
 * `cornerTokens.height` is set: override the var in a local `stylex.create`.
 */
export const selectedTokens = stylex.defineVars({
  rest: "transparent",
});

/**
 * The fill of an item under the pointer, of a pressed item and of a selected
 * item. A container that draws these fills itself sets them to `transparent`.
 *
 * @internal
 */
export const stateFillTokens = stylex.defineVars({
  hover: color.accent,
  pressed: color.secondary,
  selected: color.secondary,
});

/**
 * The primary look of the selected state, read from the ARIA state already on
 * the element: `aria-pressed`, `aria-checked` or `aria-selected` set to `true`,
 * or any `aria-current` other than `false`. An item that holds a checked
 * `Checkbox` with `look="selection"` is selected too, so a list item in a
 * selection needs no state of its own (`aria-selected` is not valid on a
 * `listitem`). The mark selects only the nearest list item or row around it,
 * not a box that holds the whole list. Set the state and the look follows.
 * Use it for a choice that decides what the visitor does next. An
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
      [SELECTED]: color.primary,
    },
    backgroundColor: {
      default: selectedTokens.rest,
      [pointer.canHover]: {
        default: null,
        ":hover:not(:disabled)": stateFillTokens.hover,
      },
      [SELECTED]: {
        default: color.primarySubtle,
        ":hover": {
          default: null,
          [pointer.canHover]: color.primarySubtle,
        },
      },
    },
  },
});
