import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { border } from "../tokens.stylex.ts";
import { duration, easing } from "./motion.stylex.ts";
import { selectedTokens } from "./selected.stylex.ts";

// StyleX cannot read a selector from another module, and it compiles a
// `defineConsts` key as an at-rule, so that selector does not match this
// element. Keep this the same as `SELECTED` in selected.stylex.ts.
const SELECTED =
  ":is([aria-pressed=true], [aria-checked=true], [aria-selected=true], [aria-current]:not([aria-current=false], [aria-current='']))";

/**
 * A link or button with no fill of its own that fills under the pointer. The
 * radius, the padding and the size stay with the caller.
 */
export const quietSurface = stylex.create({
  interactive: {
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    color: "inherit",
    textDecoration: "none",
    // StyleX puts a state in a media query after a bare state, and a selector
    // with more classes wins whatever its order. So each state that must stay
    // on top of the hover repeats in the query, and the hover has no `:not()`.
    backgroundColor: {
      default: selectedTokens.rest,
      [pointer.canHover]: {
        default: null,
        ":hover": color.bgControlHover,
        ":active": color.bgControlPressed,
        ":disabled:hover": selectedTokens.rest,
      },
      ":active": color.bgControlPressed,
      [SELECTED]: {
        default: color.bgControlSelected,
        [pointer.canHover]: {
          default: null,
          ":hover": color.bgControlSelected,
          ":active": color.bgControlSelected,
          ":disabled:hover": color.bgControlSelected,
        },
        ":active": color.bgControlSelected,
      },
    },
    transition: `color ${duration._200} ${easing.ease}, background-color ${duration._200} ${easing.ease}, border-color ${duration._200} ${easing.ease}`,
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderAccent,
    },
    outlineOffset: `calc(-1 * ${border.size_2})`,
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  },
});
