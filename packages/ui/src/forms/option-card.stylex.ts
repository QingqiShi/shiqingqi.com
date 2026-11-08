import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { duration, easing } from "../primitives/motion.stylex.ts";
import { font, opacity } from "../tokens.stylex.ts";

// StyleX cannot read a selector from another module, and it compiles a
// `defineConsts` key as an at-rule, so that selector does not match this
// element. Keep this the same as `SELECTED` in selected.stylex.ts.
const SELECTED =
  ":is([aria-pressed=true], [aria-checked=true], [aria-selected=true], [aria-current]:not([aria-current=false], [aria-current='']))";

const EASE = `${duration._200} ${easing.ease}`;

/**
 * The size of the default selection mark, and the point it centres on when it
 * sits in the corner: the centre of the card's corner arc, from the card's
 * outer edges.
 *
 * @internal
 */
export const optionCardMark = stylex.defineConsts({
  // The card is the touch target, not the mark. Thus the mark does not scale
  // on small screens, and its position does not change.
  size: "1rem",
  // This is the default value of `border.radius_3`. Do not use the token:
  // without `corner-shape`, it is smaller and the padding becomes negative.
  cornerCentre: "1rem",
});

/**
 * Marks an option card, so its selection mark can follow the card's ARIA
 * state.
 *
 * @internal
 */
export const optionCardMarker = stylex.defineMarker();

/**
 * Marks a group of option cards. The group sets `data-description-lines` when
 * its cards have the same height, and its cards then truncate their text and
 * centre the mark of a row.
 *
 * @internal
 */
export const optionCardGroupMarker = stylex.defineMarker();

/**
 * The selectable-card skin: compose it over `cardSurface.base` and
 * `cardSurface.interactive`, which carry the border width, the radius and the
 * focus ring. This adds a full-width button box, and owns the border, the
 * fill and their states, so that the accent marks only the focus.
 */
export const optionCardSurface = stylex.create({
  base: {
    boxSizing: "border-box",
    position: "relative",
    inlineSize: "100%",
    textAlign: "start",
    fontFamily: font.family,
    color: color.fg,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: null, ":disabled": opacity.disabled },
    borderColor: {
      default: color.border,
      [SELECTED]: color.borderSurfaceSelected,
    },
    // A press keeps the hover fill: a further step would hide the edge of a
    // card that is not selected. StyleX puts a state in a media query after a
    // bare state, so the press repeats in the query to stay on top of the
    // hover.
    backgroundColor: {
      default: color.bgSurface,
      ":disabled": color.bgControlDisabled,
      [pointer.canHover]: {
        default: null,
        ":hover:not(:disabled)": color.bgSurfaceHover,
        ":active:not(:disabled)": color.bgSurfaceHover,
      },
      ":active:not(:disabled)": color.bgSurfaceHover,
      [SELECTED]: {
        default: color.bgSurfaceSelected,
        ":disabled": color.bgControlDisabled,
        [pointer.canHover]: {
          default: null,
          ":hover:not(:disabled)": color.bgSurfaceSelectedHover,
          ":active:not(:disabled)": color.bgSurfaceSelectedHover,
        },
        ":active:not(:disabled)": color.bgSurfaceSelectedHover,
      },
    },
    transition: `color ${EASE}, background-color ${EASE}, border-color ${EASE}`,
  },
});

/**
 * Parts of an option card that follow its ARIA state.
 *
 * @internal
 */
export const optionCardPart = stylex.create({
  mark: {
    borderColor: {
      default: color.borderControl,
      [stylex.when.ancestor(SELECTED, optionCardMarker)]: color.fg,
    },
    backgroundColor: {
      default: "transparent",
      [stylex.when.ancestor(SELECTED, optionCardMarker)]: color.fg,
    },
  },
});
