import * as stylex from "@stylexjs/stylex";
import {
  duration,
  easing,
  motionKeyframes,
} from "@tuja/ui/primitives/motion.stylex";

/** How content fades in where its skeleton showed. */
export const reveal = stylex.create({
  fadeIn: {
    animationName: motionKeyframes.fadeIn,
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
  },
});
