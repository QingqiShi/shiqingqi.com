import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "../../breakpoints.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../../primitives/motion.stylex.ts";
import { color, constants, controlSize } from "../../tokens.stylex.ts";
import { anchorTokens } from "./anchor.stylex.ts";
import { buttonTokens } from "./button.stylex.ts";

// Can't use a `transition.*` preset for a compound transform+filter
// transition; the durations and easings still come from the shared motion
// tokens, so it tracks the scale.
const pressTransition = `background ${duration._200} ${easing.ease}, transform ${duration._150} ${easing.easeOut}, filter ${duration._150} ${easing.easeOut}`;
const releaseTransition = `background ${duration._200} ${easing.ease}, transform ${duration._300} ${easing.easeOut}, filter ${duration._300} ${easing.easeOut}`;
const reducedTransition = `background ${duration._200} ${easing.ease}`;

export const sharedStyles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    // A squircle at the full-round radius closes at half the height. The
    // circular fallback takes .6 of that, so the button stays a rounded box.
    borderRadius: {
      default: buttonTokens.borderRadius,
      [constants.NO_CORNER_SHAPE]: `min(${buttonTokens.borderRadius}, calc(${buttonTokens.height} * .3))`,
    },
    cornerShape: "squircle",
    boxShadow: buttonTokens.boxShadow,
    transition: {
      default: pressTransition,
      [motionConstants.REDUCED_MOTION]: reducedTransition,
    },
    backgroundColor: {
      default: buttonTokens.backgroundColor,
      ":hover": buttonTokens.backgroundColorHover,
    },
    transform: "scale(1) translate(0, 0)",
    filter: "brightness(1)",
    touchAction: "manipulation",
    // The focus ring (WCAG 2.4.7) is composed at the call site via
    // `a11y.focusRing`, so every button variant shares one indicator.
  },
  hasIcon: {
    paddingInlineStart: controlSize._2,
  },
  hasIconHideLabelBelowMd: {
    paddingInlineStart: {
      default: controlSize._3,
      [breakpoints.md]: controlSize._2,
    },
  },
  hasIconHideLabelBelowLg: {
    paddingInlineStart: {
      default: controlSize._3,
      [breakpoints.lg]: controlSize._2,
    },
  },
  icon: {
    display: "inline-flex",
  },
  childrenContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
  },
  hideLabelBelowMd: {
    display: { default: "none", [breakpoints.md]: "inline-flex" },
  },
  hideLabelBelowLg: {
    display: { default: "none", [breakpoints.lg]: "inline-flex" },
  },
  active: {
    [buttonTokens.color]: {
      default: color.accentOn,
      ":hover": color.accentOn,
    },
    [anchorTokens.color]: {
      default: color.accentOn,
      ":hover": color.accentOn,
    },
    backgroundColor: {
      default: color.accent,
      ":hover": color.accentHover,
      ":disabled:hover": color.accent,
    },
  },
  bright: {
    backgroundColor: color.bgSurfaceBright,
    [buttonTokens.color]: color.textOnBright,
    [anchorTokens.color]: color.textOnBright,
    filter: {
      default: "brightness(1)",
      ":hover": "brightness(1.1)",
    },
  },
  pressed: {
    transform: {
      default:
        "scale(1.05) translate(var(--button-nudge-x, 0), var(--button-nudge-y, 0))",
      [motionConstants.REDUCED_MOTION]: "scale(1) translate(0, 0)",
    },
    filter: {
      default: "brightness(1.15)",
      [motionConstants.REDUCED_MOTION]: "brightness(1)",
    },
  },
  pressedBright: {
    filter: {
      default: "brightness(1.25)",
      [motionConstants.REDUCED_MOTION]: "brightness(1)",
    },
  },
  releasedOutside: {
    transition: {
      default: releaseTransition,
      [motionConstants.REDUCED_MOTION]: reducedTransition,
    },
  },
});
