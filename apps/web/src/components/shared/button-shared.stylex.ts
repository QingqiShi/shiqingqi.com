import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { color, controlSize } from "@tuja/ui/tokens.stylex";
import { anchorTokens } from "./anchor.stylex";
import { buttonTokens } from "./button.stylex";

export const PRESS_ANIMATION_DURATION = 150;
const RELEASE_OUTSIDE_ANIMATION_DURATION = 300;

export const sharedStyles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    borderRadius: buttonTokens.borderRadius,
    boxShadow: buttonTokens.boxShadow,
    transition: {
      default: `background 0.2s ease, transform ${String(PRESS_ANIMATION_DURATION)}ms ease-out, filter ${String(PRESS_ANIMATION_DURATION)}ms ease-out`,
      [motionConstants.REDUCED_MOTION]: "background 0.2s ease",
    },
    backgroundColor: {
      default: buttonTokens.backgroundColor,
      ":hover": buttonTokens.backgroundColorHover,
    },
    // Base transform for pressed state
    transform: "scale(1) translate(0, 0)",
    filter: "brightness(1)",
    // Touch action to prevent browser gestures from interfering
    touchAction: "manipulation",
    // Focus ring for keyboard users (WCAG 2.4.7). Replaces the browser
    // default so the indicator stays consistent across browsers.
    outline: {
      default: "none",
      ":focus-visible": `2px solid ${color.accent}`,
    },
    outlineOffset: { default: null, ":focus-visible": "2px" },
  },
  hasIcon: {
    paddingLeft: controlSize._2,
  },
  hasIconHideLabel: {
    paddingLeft: { default: controlSize._3, [breakpoints.md]: controlSize._2 },
  },
  icon: {
    display: "inline-flex",
  },
  childrenContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
  },
  hideLabelOnMobile: {
    display: { default: "none", [breakpoints.md]: "inline-flex" },
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
      default: `background 0.2s ease, transform ${String(RELEASE_OUTSIDE_ANIMATION_DURATION)}ms ease-out, filter ${String(RELEASE_OUTSIDE_ANIMATION_DURATION)}ms ease-out`,
      [motionConstants.REDUCED_MOTION]: "background 0.2s ease",
    },
  },
});
