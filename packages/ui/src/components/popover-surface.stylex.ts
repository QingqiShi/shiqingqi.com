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
 * background, hairline ring, and radius only, leaving padding and clipping to
 * the component. It casts no shadow: the page blurring around it is what
 * sets a floating element apart.
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
