import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { border, color } from "../tokens.stylex.ts";

// The colour legs every interactive card shares, and the transform leg only
// `press` adds. Only the release springs, matching `button-shared`: going down
// under the finger is a grab and wants to arrive without argument, while coming
// back up is the state change worth marking.
const colourLegs = `color ${duration._200} ${easing.ease}, background-color ${duration._200} ${easing.ease}, border-color ${duration._200} ${easing.ease}`;

/**
 * The bordered-surface skin shared by every card in the system, exposed as
 * composable StyleX so a consumer can drop the exact same surface onto an
 * element the `Card` component can't be — a Next.js `<Link>`, a plain `<a>`, or
 * an `<li>` inside a list. This is the custom-layer escape hatch behind the
 * `Card` component (which composes these same styles), mirroring how
 * `button-shared.stylex` backs both `Button` and the app's anchor button.
 *
 * `interactive` layers pointer affordances on top of `base`: it re-declares the
 * hover-sensitive properties so the two compose cleanly (last write wins per
 * property). Pair it with the `transition.colors` motion primitive at the call
 * site so the hover eases rather than snaps. It also carries the shared
 * keyboard focus ring (WCAG 2.4.7) — inlined inset (mirroring
 * `a11y.focusRingInset`) because a rounded, overflow-clipping card would crop an
 * outward ring, and because a style-object primitive cannot compose another one
 * at definition time. Every interactive card thus gets one identical indicator
 * without the call site re-declaring it.
 */
export const cardSurface = stylex.create({
  base: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurface,
  },
  interactive: {
    cursor: "pointer",
    borderColor: {
      default: color.neutralBorder,
      ":hover": color.accentBorder,
    },
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.bgInteractiveHover,
    },
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: { default: "transparent", ":focus-visible": color.accent },
    outlineOffset: `calc(-1 * ${border.size_2})`,
  },
  /**
   * A card that is a control, springing on press. It carries the colour
   * transitions itself, so it *replaces* `transition.colors` at the call site
   * rather than composing with it — both write `transition`, and the last one
   * applied takes the whole declaration.
   *
   * The card shrinks rather than grows, so it never needs to sit above its
   * neighbours or have space reserved for it in the grid.
   */
  press: {
    transform: {
      default: "none",
      ":active": "scale(0.985)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `${colourLegs}, transform ${duration._400} ${easing.spring}`,
      ":active": `${colourLegs}, transform ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: colourLegs,
    },
  },
});
