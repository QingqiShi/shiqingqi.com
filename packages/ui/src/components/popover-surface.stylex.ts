import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { border, color } from "../tokens.stylex.ts";

const enterKeyframes = stylex.keyframes({
  from: { opacity: 0, transform: "scale(0.98)" },
});

/**
 * The floating-surface skin shared by every popup that hangs off an anchor —
 * `Popover` today, a `Tooltip` and `MenuButton`'s popup next. Overlay
 * background, hairline ring, and radius only: padding and clipping stay with
 * the component, so a menu can run its items edge to edge and a tooltip can
 * let an arrow escape the box.
 *
 * The surface separates itself with its background and its border, and casts
 * no shadow — a floating element is set apart by the page blurring around it.
 *
 * `enter` is an entrance only — a popup that unmounts on close has nothing left
 * to animate out — and collapses to an instant appearance under reduced motion.
 */
export const popoverSurface = stylex.create({
  base: {
    backgroundColor: color.bgOverlay,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_2,
    cornerShape: "squircle",
  },
  // Content nested at the surface's corner takes `inner = outer − border`.
  inner: {
    borderRadius: `calc(${border.radius_2} - ${border.size_1})`,
    cornerShape: "squircle",
  },
  enter: {
    animationName: {
      default: enterKeyframes,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: duration._150,
    animationTimingFunction: easing.entrance,
  },
});
